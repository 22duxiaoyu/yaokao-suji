import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { getDb } from "./client";
import { cards, knowledgeNodes, materialChunks, materials, reviewLogs, reviewSchedules, users } from "./schema";
import { getCards, getMaterials } from "../lib/mock-backend";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional; CI or hosted environments can provide DATABASE_URL directly.
}

const DEFAULT_USER_ID = 1;

function toDbCardType(type: string) {
  if (type === "填空") return "cloze" as const;
  return "qa" as const;
}

function nextDueAt(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function makeSeedChunkHash(materialId: number, index: number, content: string) {
  return createHash("sha256")
    .update(`${materialId}:${index}:${content}`)
    .digest("hex");
}

function splitSeedText(content: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= 900) {
      chunks.push(paragraph);
      continue;
    }

    for (let index = 0; index < paragraph.length; index += 900) {
      chunks.push(paragraph.slice(index, index + 900));
    }
  }

  return chunks.length > 0 ? chunks : [content];
}

function makeSeedMaterialText(materialName: string) {
  const relatedCards = getCards().filter((card) => card.source === materialName);

  if (relatedCards.length === 0) {
    return `${materialName}\n\n这是一份本地开发资料，占位用于 RAG 检索和资料索引调试。`;
  }

  return relatedCards
    .map((card) => [
      `【${card.knowledgeRef}】`,
      `问题：${card.question}`,
      `答案：${card.answer}`,
      `证据：${card.evidence}`,
      `标签：${card.tags.join("、")}`
    ].join("\n"))
    .join("\n\n");
}

async function resetSequence(table: string) {
  const db = getDb();
  if (!db) return;

  await db.execute(
    sql.raw(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);`)
  );
}

async function main() {
  const db = getDb();

  if (!db) {
    throw new Error("Missing DATABASE_URL. Create .env.local first.");
  }

  await db
    .insert(users)
    .values({
      id: DEFAULT_USER_ID,
      name: "药考学员"
    })
    .onConflictDoNothing();

  const mockMaterials = getMaterials();

  await db
    .insert(materials)
    .values(
      mockMaterials.map((material) => ({
        id: material.id,
        userId: DEFAULT_USER_ID,
        title: material.name,
        sourceType: material.sourceType ?? "upload",
        fileType: material.fileType ?? "other",
        rawText: material.rawText,
        status: material.status === "已解析" ? "parsed" as const : "uploaded" as const,
        uploadedAt: new Date(material.uploadedAt || Date.now()),
        parsedAt: material.parsedAt ? new Date(material.parsedAt) : material.status === "已解析" ? new Date() : null
      }))
    )
    .onConflictDoNothing();

  const materialByName = new Map(mockMaterials.map((material) => [material.name, material.id]));
  const mockCards = getCards();

  await db
    .insert(cards)
    .values(
      mockCards.map((card) => ({
        id: card.id,
        userId: DEFAULT_USER_ID,
        materialId: materialByName.get(card.source),
        question: card.question,
        answer: card.answer,
        cardType: toDbCardType(card.type),
        difficulty: "normal" as const,
        status: card.status,
        qualityScore: card.qualityScore,
        sourceRefs: [{ sourceTitle: card.knowledgeRef }],
        tags: card.tags
      }))
    )
    .onConflictDoNothing();

  for (const material of mockMaterials) {
    const existingChunks = await db
      .select({ id: materialChunks.id })
      .from(materialChunks)
      .where(eq(materialChunks.materialId, material.id))
      .limit(1);

    if (existingChunks.length > 0) continue;

    const seedText = material.rawText?.trim() || makeSeedMaterialText(material.name);
    const chunks = splitSeedText(seedText);
    let cursor = 0;

    await db.insert(materialChunks).values(
      chunks.map((chunk, index) => {
        const foundAt = seedText.indexOf(chunk, cursor);
        const charStart = foundAt >= 0 ? foundAt : cursor;
        const charEnd = charStart + chunk.length;
        cursor = charEnd;

        return {
          materialId: material.id,
          userId: DEFAULT_USER_ID,
          chunkIndex: index,
          sectionTitle: material.name,
          content: chunk,
          charStart,
          charEnd,
          chunkHash: makeSeedChunkHash(material.id, index, chunk),
          metadata: {
            source: material.sourceType ?? "upload",
            title: material.name,
            seed: true
          }
        };
      })
    );
  }

  const schedulableCards = mockCards.filter((card) => ["active", "edited", "flagged"].includes(card.status));
  const existingSchedules = await db.select({ id: reviewSchedules.id }).from(reviewSchedules).limit(1);

  if (existingSchedules.length === 0 && schedulableCards.length > 0) {
    await db
      .insert(reviewSchedules)
      .values(
        schedulableCards.map((card) => ({
          userId: DEFAULT_USER_ID,
          cardId: card.id,
          dueAt: nextDueAt(card.nextReviewInDays),
          intervalDays: String(card.nextReviewInDays),
          priority: card.status === "flagged" ? 2 : card.nextReviewInDays === 0 ? 1 : 0
        }))
      )
      .onConflictDoNothing();
  }

  const existingReviewLogs = await db.select({ id: reviewLogs.id }).from(reviewLogs).limit(1);
  const cardsWithHistory = mockCards.filter((card) => card.lastResult);

  if (existingReviewLogs.length === 0 && cardsWithHistory.length > 0) {
    await db.insert(reviewLogs).values(
      cardsWithHistory.map((card) => ({
        userId: DEFAULT_USER_ID,
        cardId: card.id,
        result: card.lastResult!,
        reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextDueAt: nextDueAt(card.nextReviewInDays)
      }))
    );
  }

  await db
    .insert(knowledgeNodes)
    .values([
      {
        id: 1,
        userId: DEFAULT_USER_ID,
        title: "执业药师药学知识库",
        nodeType: "system",
        summary: "由药理学、药事法规、处方审核资料沉淀形成。",
        materialIds: [1, 2, 4, 5, 6, 8],
        cardIds: [1, 2, 3, 4, 101, 102, 103, 104, 105, 106, 107]
      },
      {
        id: 2,
        userId: DEFAULT_USER_ID,
        parentId: 1,
        title: "药理学主干",
        nodeType: "chapter",
        summary: "围绕药物机制、适应证、禁忌证、不良反应构建主干。",
        materialIds: [1, 2, 4],
        cardIds: [1, 2, 3, 101, 102, 103, 104, 105]
      },
      {
        id: 3,
        userId: DEFAULT_USER_ID,
        parentId: 1,
        title: "药事法规与处方审核",
        nodeType: "chapter",
        summary: "当前主要沉淀处方管理、特殊人群用药和用药交代。",
        materialIds: [5, 6, 8],
        cardIds: [4, 106, 107]
      }
    ])
    .onConflictDoNothing();

  await Promise.all([
    resetSequence("users"),
    resetSequence("materials"),
    resetSequence("material_chunks"),
    resetSequence("cards"),
    resetSequence("review_schedules"),
    resetSequence("review_logs"),
    resetSequence("knowledge_nodes")
  ]);

  console.log("Seed completed.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
