import { createHash } from "node:crypto";

import { and, asc, count, desc, eq, inArray, lte } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/db/client";
import {
  aiProbes,
  cards,
  knowledgeNodes,
  materialChunks,
  materials,
  ragRetrievalLogs,
  reviewLogs,
  reviewSchedules
} from "@/db/schema";
import { generatePharmacyFlashcardsWithAI } from "@/lib/server/ai-card-generator";
import { parseUploadedFile } from "@/lib/server/file-parser";
import { readStoredFile } from "@/lib/server/object-storage";
import * as mock from "@/lib/mock-backend";

export type {
  CardStatus,
  ReviewResult,
  StudyCard,
  StudyMaterial,
  KnowledgeNode
} from "@/lib/mock-backend";

type DbCard = typeof cards.$inferSelect;
type DbMaterial = typeof materials.$inferSelect;
type DbSchedule = typeof reviewSchedules.$inferSelect;
type DbReviewLog = typeof reviewLogs.$inferSelect;
type DbKnowledgeNode = typeof knowledgeNodes.$inferSelect;
type DbMaterialChunk = typeof materialChunks.$inferSelect;
type DbSourceRef = {
  sourceTitle?: string;
  locator?: string;
  quote?: string;
};

const DEFAULT_USER_ID = 1;

type UploadedMaterialInput =
  | string
  | {
      fileName: string;
      fileType?: mock.StudyMaterial["fileType"];
      fileUrl?: string;
      rawText?: string;
    };

const dbCardTypeToUi = {
  qa: "问答",
  cloze: "填空",
  compare: "问答",
  case_rule: "问答",
  drug_memory: "填空"
} as const;

function getStoreDb() {
  if (!isDatabaseConfigured()) return null;
  return getDb();
}

export function getStoreMode() {
  return isDatabaseConfigured() ? "database" : "mock";
}

function getNextReviewDays(result: mock.ReviewResult, streak: number) {
  if (result === "forgotten") return 1;
  if (result === "fuzzy") return 2;
  if (result === "wrong") return 0;
  return streak >= 1 ? 7 : 4;
}

function dueAtFromDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function makeMaterialTitle(content: string) {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return `粘贴资料 ${Date.now()}`;

  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/\s+/g, " ");
  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}...` : cleaned;
}

function splitTextIntoChunks(content: string) {
  const paragraphs = content
    .split(/\n{2,}|(?<=。|？|！|；)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= 650) {
      chunks.push(paragraph);
      continue;
    }

    for (let index = 0; index < paragraph.length; index += 650) {
      chunks.push(paragraph.slice(index, index + 650));
    }
  }

  return chunks.length > 0 ? chunks : [content.trim() || "用户粘贴内容为空时的占位资料。"];
}

function makeChunkHash(materialId: number, index: number, content: string) {
  return createHash("sha256")
    .update(`${materialId}:${index}:${content}`)
    .digest("hex");
}

function inferSectionTitle(content: string, fallback: string) {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return fallback;

  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/\s+/g, " ");
  return cleaned.length > 28 ? `${cleaned.slice(0, 28)}...` : cleaned;
}

function buildChunkRows(material: DbMaterial, chunks: string[]) {
  let cursor = 0;
  const sourceText = material.rawText ?? chunks.join("\n\n");

  return chunks.map((chunk, index) => {
    const foundAt = sourceText.indexOf(chunk, cursor);
    const charStart = foundAt >= 0 ? foundAt : cursor;
    const charEnd = charStart + chunk.length;
    cursor = charEnd;

    return {
      materialId: material.id,
      userId: DEFAULT_USER_ID,
      chunkIndex: index,
      sectionTitle: inferSectionTitle(chunk, material.title),
      content: chunk,
      charStart,
      charEnd,
      chunkHash: makeChunkHash(material.id, index, chunk),
      metadata: {
        source: material.sourceType,
        title: material.title,
        fileUrl: material.fileUrl
      }
    };
  });
}

function tokenizeForSearch(text: string) {
  const normalized = text.toLowerCase();
  const raw = normalized.match(/[\p{Script=Han}]+|[a-z0-9]+/giu) ?? [];
  const tokens = new Set<string>();

  for (const item of raw) {
    if (/^[a-z0-9]+$/i.test(item)) {
      if (item.length >= 2) tokens.add(item);
      continue;
    }

    if (item.length <= 4) {
      tokens.add(item);
      continue;
    }

    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index <= item.length - size; index += 1) {
        tokens.add(item.slice(index, index + size));
      }
    }
  }

  return Array.from(tokens).filter((token) => token.length >= 2);
}

function countOccurrences(text: string, token: string) {
  if (!token) return 0;
  let count = 0;
  let index = text.indexOf(token);

  while (index >= 0) {
    count += 1;
    index = text.indexOf(token, index + token.length);
  }

  return count;
}

function scoreRagChunk(chunk: DbMaterialChunk, query: string, tokens: string[]) {
  const content = chunk.content.toLowerCase();
  const title = (chunk.sectionTitle ?? "").toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (normalizedQuery && content.includes(normalizedQuery)) {
    score += 8;
    reasons.push("命中完整问题");
  }

  if (normalizedQuery && title.includes(normalizedQuery)) {
    score += 2;
    reasons.push("命中章节标题");
  }

  for (const token of tokens) {
    const contentHits = countOccurrences(content, token);
    const titleHits = countOccurrences(title, token);

    if (contentHits > 0) {
      score += Math.min(4, contentHits) * 1.2;
    }
    if (titleHits > 0) {
      score += Math.min(2, titleHits) * 1.6;
    }
  }

  if (score > 0 && reasons.length === 0) {
    reasons.push("命中关键词");
  }

  const lengthPenalty = Math.sqrt(Math.max(1, chunk.content.length / 800));

  return {
    score: Number((score / lengthPenalty).toFixed(4)),
    reason: reasons.join("、") || "低相关候选"
  };
}

function normalizeQuestionSeed(text: string, fallback: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[-*•\d.、\s]+/, "")
    .trim();

  if (!cleaned) return fallback;
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
}

function isUsefulCardSeed(text: string) {
  const compact = text.replace(/\s+/g, "");

  if (compact.length < 28) return false;
  if (/^--\d+of\d+--$/.test(compact)) return false;
  if (/^(相关导览|目录|制定机关|发布于|有效期|检索自|查·论·编)/.test(compact)) return false;

  return /(药|片|胶囊|注射|剂量|用法|适应证|禁忌|不良反应|相互作用|机制|受体|酶|肝|肾|妊娠|哺乳|儿童|老年|抗菌|降压|降糖|抗凝|处方|审方|药事|管理|监测|依从性)/.test(compact);
}

function getTargetCardCount(material: DbMaterial, chunkRows: DbMaterialChunk[]) {
  const textLength = material.rawText?.length ?? chunkRows.reduce((sum, chunk) => sum + chunk.content.length, 0);
  const usefulCount = chunkRows.filter((chunk) => isUsefulCardSeed(chunk.content)).length;
  const baseByLength =
    textLength > 80_000 ? 24 :
      textLength > 35_000 ? 20 :
        textLength > 15_000 ? 16 :
          textLength > 5_000 ? 12 :
            textLength > 1_200 ? 8 : 4;

  const baseByChunks = usefulCount >= 18 ? 18 : usefulCount >= 12 ? 14 : usefulCount >= 8 ? 10 : usefulCount >= 4 ? 6 : 4;
  return Math.max(4, Math.min(24, Math.max(baseByLength, baseByChunks)));
}

function pickEvenly<T>(items: T[], count: number) {
  if (items.length <= count) return items;
  if (count <= 1) return [items[0]];

  const picked: T[] = [];
  const lastIndex = items.length - 1;

  for (let index = 0; index < count; index += 1) {
    const sourceIndex = Math.round((index * lastIndex) / (count - 1));
    picked.push(items[sourceIndex]);
  }

  return picked;
}

function makeCardSeeds(material: DbMaterial, chunkRows: DbMaterialChunk[], targetCount: number) {
  const usefulChunks = chunkRows.filter((chunk) => isUsefulCardSeed(chunk.content));
  const sourceChunks = usefulChunks.length > 0 ? usefulChunks : chunkRows;
  const selected = pickEvenly(sourceChunks, targetCount).map((chunk) => chunk.content);
  const fallbackSeeds = [
    "这份资料里的核心药物或药物类别是什么？",
    "这份资料里最适合做填空速记的药考关键词是什么？",
    "这份资料中最容易混淆的适应证、禁忌证或不良反应是什么？",
    "这份资料对应的处方审核或用药交代入口是什么？",
    "这份资料中的特殊人群、相互作用或监测要点是什么？",
    "这份资料如何进入下一轮复习？"
  ];
  const seeds = selected.length > 0 ? selected : [material.rawText || material.title];

  while (seeds.length < targetCount) {
    seeds.push(fallbackSeeds[seeds.length % fallbackSeeds.length]);
  }

  return seeds.slice(0, targetCount);
}

function getKnowledgeBranchesFromCards(cardRows: DbCard[]) {
  const refs = cardRows
    .flatMap((card) => Array.isArray(card.sourceRefs) ? card.sourceRefs as DbSourceRef[] : [])
    .map((ref) => [ref.sourceTitle, ref.locator].filter(Boolean).join(" "))
    .filter(Boolean);
  const tags = cardRows.flatMap((card) => card.tags).filter((tag) => !["AI出卡", "资料", "上传", "粘贴"].includes(tag));

  return Array.from(new Set([...refs, ...tags])).slice(0, 4);
}

async function syncKnowledgeNodeForMaterial({
  material,
  chunkCount,
  cardRows
}: {
  material: DbMaterial;
  chunkCount: number;
  cardRows: DbCard[];
}) {
  const db = getStoreDb();
  if (!db) return;

  const branches = getKnowledgeBranchesFromCards(cardRows);
  const sourceLabel = material.sourceType === "paste" ? "粘贴资料" : "上传资料";
  const cardSummary = cardRows.length > 0 ? `已生成 ${cardRows.length} 张速记卡` : "等待出卡";
  const branchSummary = branches.length > 0 ? `，覆盖 ${branches.join("、")}` : "";
  const summary = `由${sourceLabel}「${material.title}」沉淀，已解析 ${chunkCount} 个资料片段，${cardSummary}${branchSummary}。`;
  const existingNodes = await db
    .select()
    .from(knowledgeNodes)
    .where(and(eq(knowledgeNodes.userId, DEFAULT_USER_ID), eq(knowledgeNodes.title, material.title)));

  if (existingNodes.length > 0) {
    await db
      .update(knowledgeNodes)
      .set({
        summary,
        materialIds: [material.id],
        cardIds: cardRows.map((card) => card.id)
      })
      .where(inArray(knowledgeNodes.id, existingNodes.map((node) => node.id)));
    return;
  }

  await db.insert(knowledgeNodes).values({
    userId: DEFAULT_USER_ID,
    title: material.title,
    nodeType: "concept",
    summary,
    materialIds: [material.id],
    cardIds: cardRows.map((card) => card.id)
  });
}

function daysUntil(date?: Date | null) {
  if (!date) return 0;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function toUiMaterial(material: DbMaterial, cardCount = 0): mock.StudyMaterial {
  return {
    id: material.id,
    name: material.title,
    meta: material.status === "parsed" ? "已解析 · 数据库" : "等待解析",
    status: material.status === "parsed" ? "已解析" : "待接入",
    fileType: material.fileType,
    sourceType: material.sourceType,
    uploadedAt: material.uploadedAt.toISOString(),
    parsedAt: material.parsedAt?.toISOString(),
    cardCount,
    fileUrl: material.fileUrl ?? undefined,
    rawText: material.rawText ?? undefined
  };
}

function getSourceRefLabel(card: DbCard) {
  const sourceRefs = Array.isArray(card.sourceRefs) ? card.sourceRefs as DbSourceRef[] : [];
  const first = sourceRefs[0];

  if (!first) return "药学知识点";
  return [first.sourceTitle, first.locator].filter(Boolean).join(" ") || "药学知识点";
}

function makeEvidenceSnippet(text?: string | null) {
  const cleaned = (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/-- \d+ of \d+ --/g, "")
    .trim();

  if (!cleaned) return "暂无原文证据。";
  return cleaned.length > 170 ? `${cleaned.slice(0, 170)}...` : cleaned;
}

function getCardEvidence(card: DbCard, evidence?: string) {
  const sourceRefs = Array.isArray(card.sourceRefs) ? card.sourceRefs as DbSourceRef[] : [];
  const sourceRefEvidence = sourceRefs.find((ref) => typeof ref.quote === "string" && ref.quote.trim());

  return makeEvidenceSnippet(sourceRefEvidence?.quote || evidence);
}

function toUiCard({
  card,
  material,
  schedule,
  lastLog,
  evidence
}: {
  card: DbCard;
  material?: DbMaterial;
  schedule?: DbSchedule;
  lastLog?: DbReviewLog;
  evidence?: string;
}): mock.StudyCard {
  return {
    id: card.id,
    type: dbCardTypeToUi[card.cardType],
    question: card.question,
    answer: card.answer,
    source: material?.title ?? "药学知识点",
    sourcePage: 1,
    evidence: getCardEvidence(card, evidence),
    knowledgeRef: getSourceRefLabel(card),
    tags: card.tags,
    status: card.status,
    qualityScore: card.qualityScore,
    nextReviewInDays: schedule ? daysUntil(schedule.dueAt) : 14,
    streak: 0,
    isFavorite: card.isFavorite,
    lastResult: lastLog?.result,
    flaggedReason: card.flaggedReason ?? undefined
  };
}

async function getCardContext(cardRows: DbCard[]) {
  const db = getStoreDb();
  if (!db || cardRows.length === 0) {
    return {
      materialById: new Map<number, DbMaterial>(),
      scheduleByCardId: new Map<number, DbSchedule>(),
      lastLogByCardId: new Map<number, DbReviewLog>(),
      evidenceByMaterialId: new Map<number, string>()
    };
  }

  const materialIds = Array.from(
    new Set(cardRows.map((card) => card.materialId).filter((id): id is number => typeof id === "number"))
  );
  const cardIds = cardRows.map((card) => card.id);

  const [materialRows, scheduleRows, logRows, chunkRows] = await Promise.all([
    materialIds.length ? db.select().from(materials).where(inArray(materials.id, materialIds)) : Promise.resolve([]),
    db.select().from(reviewSchedules).where(inArray(reviewSchedules.cardId, cardIds)),
    db.select().from(reviewLogs).where(inArray(reviewLogs.cardId, cardIds)).orderBy(desc(reviewLogs.reviewedAt)),
    materialIds.length
      ? db.select().from(materialChunks).where(inArray(materialChunks.materialId, materialIds)).orderBy(asc(materialChunks.chunkIndex))
      : Promise.resolve([] as DbMaterialChunk[])
  ]);

  const materialById = new Map(materialRows.map((item) => [item.id, item]));
  const scheduleByCardId = new Map(scheduleRows.map((item) => [item.cardId, item]));
  const lastLogByCardId = new Map<number, DbReviewLog>();
  const evidenceByMaterialId = new Map<number, string>();

  for (const log of logRows) {
    if (!lastLogByCardId.has(log.cardId)) {
      lastLogByCardId.set(log.cardId, log);
    }
  }

  for (const chunk of chunkRows) {
    if (evidenceByMaterialId.has(chunk.materialId)) continue;
    if (!isUsefulCardSeed(chunk.content)) continue;
    evidenceByMaterialId.set(chunk.materialId, chunk.content);
  }

  for (const chunk of chunkRows) {
    if (!evidenceByMaterialId.has(chunk.materialId)) {
      evidenceByMaterialId.set(chunk.materialId, chunk.content);
    }
  }

  return {
    materialById,
    scheduleByCardId,
    lastLogByCardId,
    evidenceByMaterialId
  };
}

async function toUiCards(cardRows: DbCard[]) {
  const { materialById, scheduleByCardId, lastLogByCardId, evidenceByMaterialId } = await getCardContext(cardRows);

  return cardRows.map((card) =>
    toUiCard({
      card,
      material: card.materialId ? materialById.get(card.materialId) : undefined,
      schedule: scheduleByCardId.get(card.id),
      lastLog: lastLogByCardId.get(card.id),
      evidence: card.materialId ? evidenceByMaterialId.get(card.materialId) : undefined
    })
  );
}

export async function getCards(status?: mock.CardStatus) {
  const db = getStoreDb();
  if (!db) return mock.getCards(status);

  const rows = await db
    .select()
    .from(cards)
    .where(status ? eq(cards.status, status) : undefined)
    .orderBy(asc(cards.id));

  return toUiCards(rows);
}

export async function getMaterials() {
  const db = getStoreDb();
  if (!db) return mock.getMaterials();

  const [rows, cardCounts] = await Promise.all([
    db.select().from(materials).orderBy(desc(materials.uploadedAt)),
    db
      .select({ materialId: cards.materialId, value: count(cards.id) })
      .from(cards)
      .where(and(eq(cards.userId, DEFAULT_USER_ID), inArray(cards.status, ["generated", "active", "edited", "flagged"])))
      .groupBy(cards.materialId)
  ]);
  const countByMaterialId = new Map(
    cardCounts
      .filter((row): row is { materialId: number; value: number } => typeof row.materialId === "number")
      .map((row) => [row.materialId, row.value])
  );

  return rows.map((material) => toUiMaterial(material, countByMaterialId.get(material.id) ?? 0));
}

export async function getMaterial(id: number) {
  const db = getStoreDb();
  if (!db) return mock.getMaterial(id);

  const [rows, cardCountRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.id, id)).limit(1),
    db
      .select({ value: count(cards.id) })
      .from(cards)
      .where(and(eq(cards.userId, DEFAULT_USER_ID), eq(cards.materialId, id), inArray(cards.status, ["generated", "active", "edited", "flagged"])))
  ]);

  return rows[0] ? toUiMaterial(rows[0], cardCountRows[0]?.value ?? 0) : null;
}

export async function getTodayReview() {
  const db = getStoreDb();
  if (!db) return mock.getTodayReview();

  const now = new Date();
  const rows = await db
    .select({
      card: cards
    })
    .from(cards)
    .innerJoin(reviewSchedules, eq(reviewSchedules.cardId, cards.id))
    .where(
      and(
        eq(cards.userId, DEFAULT_USER_ID),
        inArray(cards.status, ["active", "edited", "flagged"]),
        lte(reviewSchedules.dueAt, now)
      )
    )
    .orderBy(asc(reviewSchedules.dueAt));

  const uniqueCards = Array.from(new Map(rows.map((row) => [row.card.id, row.card])).values());

  return toUiCards(uniqueCards);
}

export async function approveAllGeneratedCards() {
  const db = getStoreDb();
  if (!db) return mock.approveAllGeneratedCards();

  const generatedRows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, DEFAULT_USER_ID), eq(cards.status, "generated")));

  if (generatedRows.length > 0) {
    await db
      .update(cards)
      .set({
        status: "active",
        updatedAt: new Date()
      })
      .where(and(eq(cards.userId, DEFAULT_USER_ID), eq(cards.status, "generated")));

    await db.insert(reviewSchedules).values(
      generatedRows.map((card) => ({
        userId: DEFAULT_USER_ID,
        cardId: card.id,
        dueAt: new Date(),
        intervalDays: "0",
        priority: 0
      }))
    );
  }

  return getCards();
}

export async function updateCard(cardId: number, patch: Partial<mock.StudyCard>) {
  const db = getStoreDb();
  if (!db) return mock.updateCard(cardId, patch);

  const updatePatch: Partial<typeof cards.$inferInsert> = {
    updatedAt: new Date()
  };

  if (typeof patch.question === "string") updatePatch.question = patch.question;
  if (typeof patch.answer === "string") updatePatch.answer = patch.answer;
  if (patch.status) updatePatch.status = patch.status;
  if (typeof patch.isFavorite === "boolean") updatePatch.isFavorite = patch.isFavorite;
  if (typeof patch.flaggedReason === "string") updatePatch.flaggedReason = patch.flaggedReason;

  const rows = await db.update(cards).set(updatePatch).where(eq(cards.id, cardId)).returning();

  if (!rows[0]) return null;

  if (patch.status === "active" && patch.nextReviewInDays === 0) {
    const existingSchedule = await db
      .select({ id: reviewSchedules.id })
      .from(reviewSchedules)
      .where(eq(reviewSchedules.cardId, cardId))
      .limit(1);

    if (existingSchedule.length > 0) {
      await db
        .update(reviewSchedules)
        .set({
          dueAt: new Date(),
          intervalDays: "0",
          priority: 0
        })
        .where(eq(reviewSchedules.cardId, cardId));
    } else {
      await db.insert(reviewSchedules).values({
        userId: DEFAULT_USER_ID,
        cardId,
        dueAt: new Date(),
        intervalDays: "0",
        priority: 0
      });
    }
  }

  const [uiCard] = await toUiCards(rows);
  return uiCard ?? null;
}

export async function toggleCardFlag(cardId: number, reason?: string) {
  const db = getStoreDb();
  if (!db) return mock.toggleCardFlag(cardId);

  const row = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const card = row[0];
  if (!card) return null;

  const nextStatus = card.status === "flagged" && !reason ? "active" : "flagged";
  return updateCard(cardId, {
    status: nextStatus,
    flaggedReason: nextStatus === "flagged" ? reason || card.flaggedReason || "用户标记待检查" : ""
  });
}

export async function rewriteCardWithAI(cardId: number, reason?: string) {
  const db = getStoreDb();
  if (!db) return null;

  const cardRows = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const card = cardRows[0];

  if (!card) return null;

  const [uiCard] = await toUiCards([card]);
  const evidence = uiCard?.evidence || "";
  const prompt = [
    `原题：${card.question}`,
    `原答案：${card.answer}`,
    reason ? `用户反馈：${reason}` : "",
    evidence ? `原文依据：${evidence}` : ""
  ].filter(Boolean).join("\n");
  const [draft] = await generatePharmacyFlashcardsWithAI({
    materialTitle: uiCard?.source || "待优化卡片",
    chunks: [prompt],
    requestedCount: 1
  });

  if (!draft) return uiCard ?? null;

  const updatedRows = await db
    .update(cards)
    .set({
      question: draft.question,
      answer: draft.answer,
      explanation: draft.explanation,
      cardType: draft.cardType,
      difficulty: draft.difficulty,
      qualityScore: draft.qualityScore,
      sourceRefs: draft.sourceRefs,
      tags: Array.from(new Set([...draft.tags, "AI优化"])),
      status: card.status === "generated" ? "generated" : "edited",
      flaggedReason: reason ? `已按反馈优化：${reason}` : "已由 AI 优化",
      updatedAt: new Date()
    })
    .where(eq(cards.id, cardId))
    .returning();

  const [rewrittenCard] = await toUiCards(updatedRows);
  return rewrittenCard ?? null;
}

export async function submitReviewResult(cardId: number, result: mock.ReviewResult) {
  const db = getStoreDb();
  if (!db) return mock.submitReviewResult(cardId, result);

  const cardRows = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const card = cardRows[0];

  if (!card) {
    return {
      card: null,
      shouldProbe: false,
      nextCards: await getTodayReview()
    };
  }

  const nextDays = getNextReviewDays(result, 0);
  const nextDueAt = dueAtFromDays(nextDays);

  await db.insert(reviewLogs).values({
    userId: DEFAULT_USER_ID,
    cardId,
    result,
    nextDueAt
  });

  await db
    .update(cards)
    .set({
      status: result === "wrong" ? "flagged" : card.status,
      updatedAt: new Date()
    })
    .where(eq(cards.id, cardId));

  const existingSchedule = await db
    .select()
    .from(reviewSchedules)
    .where(eq(reviewSchedules.cardId, cardId))
    .limit(1);

  if (existingSchedule[0]) {
    await db
      .update(reviewSchedules)
      .set({
        dueAt: nextDueAt,
        intervalDays: String(nextDays),
        priority: result === "forgotten" ? 2 : result === "fuzzy" ? 1 : 0
      })
      .where(eq(reviewSchedules.cardId, cardId));
  } else {
    await db.insert(reviewSchedules).values({
      userId: DEFAULT_USER_ID,
      cardId,
      dueAt: nextDueAt,
      intervalDays: String(nextDays),
      priority: result === "forgotten" ? 2 : result === "fuzzy" ? 1 : 0
    });
  }

  const updatedRows = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const [uiCard] = await toUiCards(updatedRows);

  return {
    card: uiCard ?? null,
    shouldProbe: result === "fuzzy" || result === "forgotten",
    nextCards: await getTodayReview()
  };
}

export async function createPastedMaterial(content: string) {
  const db = getStoreDb();
  if (!db) return mock.createPastedMaterial(content);

  const trimmed = content.trim();
  const rows = await db
    .insert(materials)
    .values({
      userId: DEFAULT_USER_ID,
      title: makeMaterialTitle(trimmed),
      sourceType: "paste",
      fileType: "text",
      rawText: trimmed || "用户粘贴内容为空时的占位资料。",
      status: "uploaded",
      parsedAt: null
    })
    .returning();

  const material = rows[0];

  if (!material) return null;

  return toUiMaterial(material);
}

export async function createUploadedMaterial(input?: UploadedMaterialInput) {
  const db = getStoreDb();
  if (!db) return mock.createUploadedMaterial(typeof input === "string" ? input : input?.fileName);

  const title = typeof input === "string" ? input.trim() || `上传资料 ${Date.now()}.pdf` : input?.fileName.trim() || `上传资料 ${Date.now()}.pdf`;
  const rawText = typeof input === "object" ? input.rawText?.trim() : undefined;
  const fileUrl = typeof input === "object" ? input.fileUrl : undefined;
  const fileType =
    typeof input === "object" && input.fileType
      ? input.fileType
      : title.endsWith(".doc") || title.endsWith(".docx")
        ? "word"
        : title.endsWith(".txt")
          ? "text"
          : "pdf";
  const rows = await db
    .insert(materials)
    .values({
      userId: DEFAULT_USER_ID,
      title,
      sourceType: "upload",
      fileType,
      fileUrl,
      rawText,
      status: "uploaded",
      parsedAt: null
    })
    .returning();

  const material = rows[0];

  if (!material) return null;

  return toUiMaterial(material);
}

async function readStoredMaterialText(material: DbMaterial) {
  const existingText = material.rawText?.trim();

  if (existingText) {
    return {
      fileType: material.fileType,
      text: existingText
    };
  }

  if (!material.fileUrl) {
    throw new Error("这份资料缺少源文件，请重新上传后再拆解。");
  }

  const buffer = await readStoredFile(material.fileUrl);

  return parseUploadedFile({
    buffer,
    fileName: material.title
  });
}

export async function parseMaterial(materialId: number) {
  const db = getStoreDb();
  if (!db) return mock.parseMaterial(materialId);

  const materialRows = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  const material = materialRows[0];

  if (!material) return null;

  const existingChunks = await db
    .select()
    .from(materialChunks)
    .where(eq(materialChunks.materialId, materialId))
    .orderBy(asc(materialChunks.chunkIndex));

  if ((material.status === "parsed" || material.status === "indexed") && existingChunks.length > 0) {
    return toUiMaterial(material);
  }

  await db
    .update(materials)
    .set({
      status: "parsing"
    })
    .where(eq(materials.id, materialId));

  try {
    const parsed = await readStoredMaterialText(material);
    const chunks = existingChunks.length > 0 ? existingChunks.map((chunk) => chunk.content) : splitTextIntoChunks(parsed.text);

    if (existingChunks.length === 0) {
      await db.insert(materialChunks).values(buildChunkRows({ ...material, rawText: parsed.text }, chunks));
    }

    const updatedRows = await db
      .update(materials)
      .set({
        fileType: parsed.fileType,
        rawText: parsed.text,
        status: "parsed",
        parsedAt: new Date()
      })
      .where(eq(materials.id, materialId))
      .returning();
    const parsedMaterial = updatedRows[0] ?? material;

    await syncKnowledgeNodeForMaterial({
      material: parsedMaterial,
      chunkCount: chunks.length,
      cardRows: []
    });

    return toUiMaterial(parsedMaterial);
  } catch (error) {
    await db
      .update(materials)
      .set({
        status: "failed"
      })
      .where(eq(materials.id, materialId));

    throw error;
  }
}

export async function searchRag({
  query,
  materialId,
  limit = 8
}: {
  query: string;
  materialId?: number;
  limit?: number;
}) {
  const db = getStoreDb();
  const trimmedQuery = query.trim();
  const cappedLimit = Math.min(20, Math.max(1, Math.floor(limit)));

  if (!trimmedQuery) {
    return {
      query,
      scope: materialId ? "single_material" : "personal",
      chunks: [],
      retrievalLogId: null
    };
  }

  if (!db) {
    return {
      query: trimmedQuery,
      scope: materialId ? "single_material" : "personal",
      chunks: [],
      retrievalLogId: null
    };
  }

  if (materialId) {
    const material = await getMaterial(materialId);

    if (!material) {
      return {
        query: trimmedQuery,
        scope: "single_material",
        chunks: [],
        retrievalLogId: null
      };
    }

    const chunkCount = await db
      .select()
      .from(materialChunks)
      .where(eq(materialChunks.materialId, materialId))
      .limit(1);

    if (chunkCount.length === 0) {
      await parseMaterial(materialId);
    }
  }

  const tokens = tokenizeForSearch(trimmedQuery);
  const chunkRows = await db
    .select()
    .from(materialChunks)
    .where(materialId ? eq(materialChunks.materialId, materialId) : eq(materialChunks.userId, DEFAULT_USER_ID))
    .orderBy(asc(materialChunks.chunkIndex));
  const startedAt = Date.now();
  const ranked = chunkRows
    .map((chunk) => {
      const scored = scoreRagChunk(chunk, trimmedQuery, tokens);

      return {
        chunk,
        ...scored
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.chunkIndex - b.chunk.chunkIndex)
    .slice(0, cappedLimit);
  const fallback = ranked.length > 0 ? ranked : chunkRows.slice(0, cappedLimit).map((chunk) => ({
    chunk,
    score: 0,
    reason: "未命中关键词，返回资料前段兜底"
  }));
  const retrievedChunkIds = fallback.map((item) => item.chunk.id);
  const logRows = await db
    .insert(ragRetrievalLogs)
    .values({
      userId: DEFAULT_USER_ID,
      materialId,
      query: trimmedQuery,
      scope: materialId ? "single_material" as const : "personal" as const,
      retrievedChunkIds,
      usedChunkIds: retrievedChunkIds,
      scores: fallback.map((item) => ({
        chunkId: item.chunk.id,
        score: item.score,
        reason: item.reason
      })),
      latencyMs: Date.now() - startedAt,
      metadata: {
        mode: "keyword_hybrid_v1",
        tokens,
        limit: cappedLimit
      }
    })
    .returning();

  return {
    query: trimmedQuery,
    scope: materialId ? "single_material" : "personal",
    retrievalLogId: logRows[0]?.id ?? null,
    chunks: fallback.map((item) => ({
      id: item.chunk.id,
      materialId: item.chunk.materialId,
      chunkIndex: item.chunk.chunkIndex,
      sectionTitle: item.chunk.sectionTitle,
      pageNo: item.chunk.pageNo,
      charStart: item.chunk.charStart,
      charEnd: item.chunk.charEnd,
      content: item.chunk.content,
      score: item.score,
      reason: item.reason
    }))
  };
}

export async function generateCardsForMaterial(materialId: number) {
  const db = getStoreDb();
  if (!db) return mock.generateCardsForMaterial(materialId);

  const materialRows = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  const material = materialRows[0];

  if (!material) return [];

  if (material.status !== "parsed" && material.status !== "indexed") return [];

  const chunkRows = await db
    .select()
    .from(materialChunks)
    .where(eq(materialChunks.materialId, materialId))
    .orderBy(asc(materialChunks.chunkIndex));

  if (chunkRows.length === 0) return [];

  const targetCount = getTargetCardCount(material, chunkRows);
  const cardInputs = makeCardSeeds(material, chunkRows, targetCount);

  const existingRows = await db
    .select()
    .from(cards)
    .where(eq(cards.materialId, materialId))
    .orderBy(asc(cards.id));

  if (existingRows.length >= targetCount) {
    await syncKnowledgeNodeForMaterial({
      material,
      chunkCount: chunkRows.length,
      cardRows: existingRows
    });
    return toUiCards(existingRows);
  }

  const missingInputs = cardInputs.slice(existingRows.length);
  const aiDrafts = await generatePharmacyFlashcardsWithAI({
    materialTitle: material.title,
    chunks: missingInputs,
    requestedCount: missingInputs.length
  });
  const fallbackDrafts = missingInputs.map((seed, offset) => {
    const index = existingRows.length + offset;

    return {
      question:
        index % 2 === 0
          ? `根据资料，如何速记「${normalizeQuestionSeed(seed, material.title)}」？`
          : `填空：${normalizeQuestionSeed(seed, material.title)} 的核心关键词是____。`,
      answer:
        index % 2 === 0
          ? `先抓住机制、适应证、禁忌证、不良反应、相互作用和特殊人群提示，再压缩成一张只考一个点的速记卡。资料片段：${normalizeQuestionSeed(seed, material.title)}`
          : "核心关键词需要结合资料上下文确认。当前已把该片段入库，后续会由正式模型生成精准答案。",
      explanation: "这是本地兜底卡片，正式出卡时会由结构化 Prompt 和质检流程补全。",
      cardType: index % 2 === 0 ? "qa" as const : "cloze" as const,
      difficulty: "normal" as const,
      qualityScore: Math.max(82, 92 - index),
      sourceRefs: [{ sourceTitle: "药考出卡规则" }],
      tags: ["AI出卡", "资料", material.sourceType === "paste" ? "粘贴" : "上传"]
    };
  });
  const draftCards = fallbackDrafts.map((fallback, index) => {
    const aiDraft = aiDrafts[index];

    if (!aiDraft) return fallback;

    return {
      ...fallback,
      ...aiDraft,
      tags: Array.from(new Set([...aiDraft.tags, material.sourceType === "paste" ? "粘贴" : "上传"]))
    };
  });

  const rows = await db
    .insert(cards)
    .values(
      draftCards.map((draft) => ({
        userId: DEFAULT_USER_ID,
        materialId,
        question: draft.question,
        answer: draft.answer,
        explanation: draft.explanation,
        cardType: draft.cardType,
        difficulty: draft.difficulty,
        status: "generated" as const,
        qualityScore: draft.qualityScore,
        sourceRefs: draft.sourceRefs,
        tags: draft.tags
      }))
    )
    .returning();

  const allRows = [...existingRows, ...rows];

  await syncKnowledgeNodeForMaterial({
    material,
    chunkCount: chunkRows.length,
    cardRows: allRows
  });

  return toUiCards(allRows);
}

export async function getProgressOverview() {
  const db = getStoreDb();
  if (!db) return mock.getProgressOverview();

  const [cardList, materialList] = await Promise.all([getCards(), getMaterials()]);
  const activeCards = cardList.filter((card) => ["active", "edited", "flagged"].includes(card.status));
  const dueCards = activeCards.filter((card) => card.nextReviewInDays === 0);
  const flaggedCards = activeCards.filter((card) => card.status === "flagged");

  return {
    dueCount: dueCards.length,
    flaggedCount: flaggedCards.length,
    cardCount: activeCards.length,
    materialCount: materialList.length,
    stability: 68,
    weekPlan: [
      { label: "今", value: dueCards.length },
      { label: "明", value: activeCards.filter((card) => card.nextReviewInDays === 1).length },
      { label: "3天", value: activeCards.filter((card) => card.nextReviewInDays === 2).length + 1 },
      { label: "7天", value: activeCards.filter((card) => card.nextReviewInDays === 7).length + 2 },
      { label: "14天", value: 1 }
    ]
  };
}

export async function getKnowledgeGraph() {
  const db = getStoreDb();
  if (!db) return mock.getKnowledgeGraph();

  const rows = await db.select().from(knowledgeNodes).orderBy(asc(knowledgeNodes.id));
  return mergeKnowledgeRows(rows).map(toUiKnowledgeNode);
}

export async function getKnowledgeNode(id: number) {
  const db = getStoreDb();
  if (!db) return mock.getKnowledgeNode(id);

  const rows = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
  return rows[0] ? toUiKnowledgeNode(rows[0]) : null;
}

function toUiKnowledgeNode(node: DbKnowledgeNode): mock.KnowledgeNode {
  const coverage = node.summary.match(/覆盖\s*([^。]+)。?/)?.[1];
  const branches = coverage
    ? coverage
        .split(/[、,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    id: node.id,
    parentId: node.parentId,
    title: node.title,
    nodeType: node.nodeType,
    summary: node.summary,
    branches,
    materialIds: node.materialIds,
    cardIds: node.cardIds
  };
}

function mergeKnowledgeRows(rows: DbKnowledgeNode[]) {
  const merged = new Map<string, DbKnowledgeNode>();

  for (const row of rows) {
    const materialKey = [...row.materialIds].sort((a, b) => a - b).join(",");
    const key = `${row.userId}:${row.title}:${materialKey || row.nodeType}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, row);
      continue;
    }

    const cardIds = Array.from(new Set([...existing.cardIds, ...row.cardIds])).sort((a, b) => a - b);
    const materialIds = Array.from(new Set([...existing.materialIds, ...row.materialIds])).sort((a, b) => a - b);
    const summary =
      row.cardIds.length > existing.cardIds.length || (!existing.cardIds.length && row.summary.length > existing.summary.length)
        ? row.summary
        : existing.summary;

    merged.set(key, {
      ...existing,
      summary,
      materialIds,
      cardIds
    });
  }

  return Array.from(merged.values());
}

export async function createAIProbe(cardId: number, triggerResult: mock.ReviewResult) {
  const db = getStoreDb();
  if (!db) return mock.createAIProbe(cardId, triggerResult);

  if (triggerResult !== "fuzzy" && triggerResult !== "forgotten") {
    return null;
  }

  const cardList = await getCards();
  const card = cardList.find((item) => item.id === cardId);

  if (!card) return null;

  const diagnosis =
    triggerResult === "forgotten"
      ? "这张卡可能不是单纯没背，而是药物机制、禁忌或不良反应之间的边界没有区分清楚。"
      : "这张卡已经有印象，但关键用药点还不够稳定。";

  const rows = await db
    .insert(aiProbes)
    .values({
      userId: DEFAULT_USER_ID,
      cardId,
      triggerResult,
      diagnosis,
      suggestionType: card.tags.includes("相互作用") ? "compare_card" : "cloze_card",
      suggestedQuestion: card.tags.includes("相互作用")
        ? "这组相互作用最容易和哪类用药禁忌混淆？"
        : `${card.knowledgeRef} 中最容易漏掉的药考关键词是什么？`,
      suggestedAnswer: card.tags.includes("相互作用")
        ? "先判断是否属于配伍禁忌、药效增强或药效降低，再记住对应风险和处理方式。"
        : "优先记忆机制、适应证、禁忌证、不良反应、相互作用和特殊人群提示。"
    })
    .returning();

  const probe = rows[0];

  if (!probe) return null;

  return {
    id: probe.id,
    cardId: probe.cardId,
    triggerResult: probe.triggerResult,
    diagnosis: probe.diagnosis,
    suggestionType: probe.suggestionType,
    suggestedQuestion: probe.suggestedQuestion,
    suggestedAnswer: probe.suggestedAnswer,
    status: probe.status,
    createdAt: probe.createdAt.toISOString()
  };
}
