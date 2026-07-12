"use client";

import {
  ArrowLeft,
  Bell,
  BookOpenCheck,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Edit3,
  ExternalLink,
  FileAudio,
  FileText,
  FileType,
  Flag,
  Flame,
  HardDrive,
  Layers3,
  Library,
  Network,
  Pill,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { type CSSProperties, type ChangeEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type View = "progress" | "upload" | "cards" | "review" | "project" | "materialList" | "cardLibrary" | "cardEditor" | "knowledgeBase" | "weakCoach" | "profile";
type CardStatus = "generated" | "active" | "edited" | "flagged" | "deleted";
type ReviewResult = "remembered" | "fuzzy" | "forgotten" | "wrong";
type CardType = "问答" | "填空" | "判断";
type ParseStep = -1 | 0 | 1 | 2 | 3;
type ReviewDifficulty = "hard" | "normal" | "easy";
type ReviewPhase = "first" | "reinforce";

type ReviewSession = {
  queueIds: number[];
  cursor: number;
  roundTotal: number;
  answeredInRound: number;
  phase: ReviewPhase;
  reinforceIds: number[];
  completed: boolean;
  stats: {
    remembered: number;
    fuzzy: number;
    forgotten: number;
    reinforced: number;
  };
};

type DailyReviewPlan = {
  cards: StudyCard[];
  dueCount: number;
  quota: number;
  backlogCount: number;
  aiReason: string;
};

type StudyCard = {
  id: number;
  type: CardType;
  question: string;
  answer: string;
  source: string;
  sourcePage: number;
  evidence: string;
  knowledgeRef: string;
  tags: string[];
  status: CardStatus;
  qualityScore: number;
  nextReviewInDays: number;
  streak: number;
  isFavorite?: boolean;
  lastResult?: ReviewResult;
  flaggedReason?: string;
};

type Material = {
  id: number;
  name: string;
  meta: string;
  status: "已解析" | "待接入";
  fileType?: "pdf" | "word" | "ppt" | "text" | "audio" | "video" | "other";
  sourceType?: "upload" | "paste";
  uploadedAt?: string;
  parsedAt?: string;
  cardCount?: number;
  fileUrl?: string;
  rawText?: string;
  icon: ReactNode;
};

type ApiMaterial = Omit<Material, "icon"> & {
  uploadedAt?: string;
  parsedAt?: string;
  cardCount?: number;
  sourceType?: "upload" | "paste";
  rawText?: string;
};

type KnowledgeNode = {
  id: number;
  parentId?: number | null;
  title: string;
  nodeType: "system" | "subject" | "chapter" | "concept";
  summary: string;
  branches: string[];
  materialIds: number[];
  cardIds: number[];
};

type KnowledgeTopicRow = {
  id: number | string;
  title: string;
  badge: string;
  summary: string;
  branches: string[];
  sourceNames: string[];
  materialIds: number[];
  cardIds: number[];
  cardCount: number;
  isRoot: boolean;
};

type ProfilePanel = "streak" | "learning" | "sync" | "account" | "review" | "reminder" | "privacy" | "about";

type SheetState =
  | {
      type: "feedback" | "edit";
      cardId: number;
    }
  | null;
type CardLibraryFilter = "all" | "flagged" | "edited";

const isPublicDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const demoMaxUploadMb = process.env.NEXT_PUBLIC_DEMO_MAX_UPLOAD_MB || "4";

const generatedSeedCards: StudyCard[] = [
  {
    id: 1,
    type: "问答",
    question: "阿司匹林最需要警惕的典型不良反应是什么？",
    answer: "胃肠道刺激和出血风险，尤其是消化性溃疡、合并抗凝药或高龄患者更要警惕。",
    source: "药理学高频药物讲义.pdf",
    sourcePage: 12,
    evidence: "讲义第 12 页把阿司匹林的不良反应与禁忌证放在同一张高频表。",
    knowledgeRef: "药理学 · 解热镇痛抗炎药",
    tags: ["药理", "不良反应", "高频"],
    status: "generated",
    qualityScore: 93,
    nextReviewInDays: 0,
    streak: 0
  },
  {
    id: 2,
    type: "填空",
    question: "β受体阻滞剂禁用于支气管哮喘，主要因为可能诱发____。",
    answer: "支气管痉挛。非选择性 β 受体阻滞剂阻断 β2 受体后，可能加重哮喘或诱发支气管收缩。",
    source: "药理学高频药物讲义.pdf",
    sourcePage: 31,
    evidence: "讲义第 31 页将 β 受体阻滞剂禁忌证标注为心血管药物易错点。",
    knowledgeRef: "药理学 · 心血管系统药",
    tags: ["药理", "禁忌证"],
    status: "generated",
    qualityScore: 88,
    nextReviewInDays: 0,
    streak: 0
  },
  {
    id: 3,
    type: "判断",
    question: "青霉素用药前不需要询问过敏史。这个说法对吗？",
    answer: "不对。青霉素类药物用药前必须重视过敏史和过敏反应风险，必要时按规范进行皮试。",
    source: "抗菌药物专题.docx",
    sourcePage: 45,
    evidence: "专题资料将青霉素过敏反应、皮试和抢救要点放在同一组速记。",
    knowledgeRef: "药理学 · 抗菌药物",
    tags: ["抗菌药", "用药安全"],
    status: "generated",
    qualityScore: 91,
    nextReviewInDays: 0,
    streak: 0
  },
  {
    id: 4,
    type: "问答",
    question: "华法林与维生素 K 的关系怎么速记？",
    answer: "华法林抑制维生素 K 依赖性凝血因子合成；维生素 K 可用于拮抗华法林抗凝作用。",
    source: "处方审核错题整理.docx",
    sourcePage: 8,
    evidence: "错题第 8 页把华法林相互作用和出血风险作为处方审核重点。",
    knowledgeRef: "临床用药 · 抗凝药",
    tags: ["相互作用", "处方审核"],
    status: "generated",
    qualityScore: 86,
    nextReviewInDays: 0,
    streak: 0
  }
];

const activeSeedCards: StudyCard[] = [
  {
    id: 101,
    type: "问答",
    question: "二甲双胍最常见的不良反应和重要禁忌分别是什么？",
    answer: "常见胃肠道反应；严重肾功能不全等乳酸酸中毒高风险情况应避免使用。",
    source: "降糖药专题讲义.pdf",
    sourcePage: 26,
    evidence: "讲义用二甲双胍、磺脲类、胰岛素三组药物对比不良反应和禁忌。",
    knowledgeRef: "药理学 · 降糖药",
    tags: ["药理", "降糖药"],
    status: "active",
    qualityScore: 84,
    nextReviewInDays: 0,
    streak: 0,
    lastResult: "forgotten"
  },
  {
    id: 102,
    type: "填空",
    question: "头孢菌素与酒精同用可能出现____样反应。",
    answer: "双硫仑样反应。表现可有面部潮红、恶心、心悸、血压下降等，应提醒患者用药期间避免饮酒。",
    source: "抗菌药物专题.docx",
    sourcePage: 1,
    evidence: "专题第 1 页将头孢与酒精相互作用列为用药交代高频点。",
    knowledgeRef: "临床用药 · 抗菌药物",
    tags: ["抗菌药", "相互作用"],
    status: "active",
    qualityScore: 81,
    nextReviewInDays: 0,
    streak: 1,
    lastResult: "fuzzy"
  },
  {
    id: 103,
    type: "问答",
    question: "硝酸甘油舌下含服的核心用药交代是什么？",
    answer: "急性心绞痛发作时舌下含服，注意避光保存；若多次含服仍不缓解，应及时就医。",
    source: "药理学高频药物讲义.pdf",
    sourcePage: 38,
    evidence: "精讲第 38 页把硝酸甘油的给药途径、储存和低血压风险整理为用药交代。",
    knowledgeRef: "药理学 · 抗心绞痛药",
    tags: ["心血管", "用药交代"],
    status: "active",
    qualityScore: 89,
    nextReviewInDays: 2,
    streak: 1,
    lastResult: "remembered"
  },
  {
    id: 104,
    type: "判断",
    question: "氨基糖苷类抗菌药主要需要警惕耳毒性和肾毒性。这个说法对吗？",
    answer: "对。氨基糖苷类应重点监测耳毒性、肾毒性，特殊人群和合并用药时更要谨慎。",
    source: "抗菌药物专题.docx",
    sourcePage: 4,
    evidence: "笔记第 4 页将氨基糖苷类的不良反应与给药监护整理成表。",
    knowledgeRef: "药理学 · 抗菌药物",
    tags: ["抗菌药", "不良反应"],
    status: "active",
    qualityScore: 86,
    nextReviewInDays: 3,
    streak: 1,
    lastResult: "remembered"
  },
  {
    id: 105,
    type: "填空",
    question: "长期使用糖皮质激素不能突然停药，主要是为了避免____。",
    answer: "肾上腺皮质功能不全或反跳现象。应按医嘱逐渐减量，并关注感染、血糖、骨质疏松等风险。",
    source: "药理学高频药物讲义.pdf",
    sourcePage: 16,
    evidence: "讲义将糖皮质激素停药、感染风险和代谢不良反应放在一张对照表中。",
    knowledgeRef: "药理学 · 激素类药物",
    tags: ["药理", "不良反应"],
    status: "edited",
    qualityScore: 90,
    nextReviewInDays: 7,
    streak: 2,
    lastResult: "remembered"
  },
  {
    id: 106,
    type: "问答",
    question: "处方审核里，妊娠期用药为什么必须单独标记？",
    answer: "妊娠期涉及胎儿安全和药物致畸风险，审核时要结合孕周、药物安全性分级和替代方案判断。",
    source: "处方审核训练.pptx",
    sourcePage: 1,
    evidence: "冲刺课用妊娠期、哺乳期、儿童、老年人四类特殊人群做用药风险对比。",
    knowledgeRef: "临床用药 · 特殊人群",
    tags: ["特殊人群", "处方审核"],
    status: "flagged",
    qualityScore: 79,
    nextReviewInDays: 1,
    streak: 0,
    lastResult: "forgotten"
  },
  {
    id: 107,
    type: "问答",
    question: "处方保存年限在药事管理中怎么记忆？",
    answer: "按处方类型分层记忆：普通处方、急诊处方、儿科处方和特殊管理药品处方保存要求不同，先抓住“特殊管理药品更严格”。",
    source: "药事管理与法规笔记.md",
    sourcePage: 32,
    evidence: "资料用普通处方、急诊处方、儿科处方、麻精药品处方进行横向比较。",
    knowledgeRef: "药事管理与法规 · 处方管理",
    tags: ["药事法规", "处方管理"],
    status: "active",
    qualityScore: 87,
    nextReviewInDays: 14,
    streak: 2,
    lastResult: "remembered"
  }
];

const materialSeed: Material[] = [
  {
    id: 1,
    name: "药理学高频药物讲义.pdf",
    meta: "88 页 · 18 张卡",
    status: "已解析",
    fileType: "pdf",
    icon: <FileText size={18} />
  },
  {
    id: 2,
    name: "抗菌药物专题.docx",
    meta: "24 页 · 11 张卡",
    status: "已解析",
    fileType: "word",
    icon: <FileType size={18} />
  },
  {
    id: 3,
    name: "执业药师冲刺课录音.m4a",
    meta: "V1 接入转写",
    status: "待接入",
    fileType: "audio",
    icon: <FileAudio size={18} />
  },
  {
    id: 4,
    name: "降糖药专题讲义.pdf",
    meta: "64 页 · 16 张卡",
    status: "已解析",
    fileType: "pdf",
    icon: <FileText size={18} />
  },
  {
    id: 5,
    name: "药事管理与法规笔记.md",
    meta: "12 页 · 9 张卡",
    status: "已解析",
    fileType: "text",
    icon: <FileType size={18} />
  },
  {
    id: 6,
    name: "处方审核训练.pptx",
    meta: "32 页 · 7 张卡",
    status: "已解析",
    fileType: "ppt",
    icon: <FileType size={18} />
  },
  {
    id: 7,
    name: "考前串讲视频.mp4",
    meta: "等待视频解析",
    status: "待接入",
    fileType: "video",
    icon: <FileAudio size={18} />
  },
  {
    id: 8,
    name: "处方审核错题整理.docx",
    meta: "18 页 · 6 张卡",
    status: "已解析",
    fileType: "word",
    icon: <FileType size={18} />
  }
];

const parseStages = ["读取资料", "拆解药考点", "匹配药学依据", "生成卡片"];

const reviewProfiles: Record<
  ReviewDifficulty,
  {
    label: string;
    name: string;
    hint: string;
    summary: string;
    risk: string;
    nodes: { label: string; action: string; retention: number }[];
  }
> = {
  hard: {
    label: "难",
    name: "难内容",
    hint: "间隔更短",
    summary: "当日 → 2天 → 3天 → 5天 → 7天 → 14天",
    risk: "高混淆",
    nodes: [
      { label: "今", action: "快回忆", retention: 94 },
      { label: "2天", action: "正式复习", retention: 76 },
      { label: "3天", action: "追问", retention: 66 },
      { label: "5天", action: "错因", retention: 58 },
      { label: "7天", action: "依据", retention: 50 },
      { label: "14天", action: "巩固", retention: 43 }
    ]
  },
  normal: {
    label: "普",
    name: "普通内容",
    hint: "标准节奏",
    summary: "当日 → 2天 → 4天 → 7天 → 15天 → 30天",
    risk: "常规",
    nodes: [
      { label: "今", action: "快回忆", retention: 94 },
      { label: "2天", action: "首次", retention: 80 },
      { label: "4天", action: "复盘", retention: 67 },
      { label: "7天", action: "迁移", retention: 56 },
      { label: "15天", action: "抽检", retention: 48 },
      { label: "30天", action: "考前", retention: 40 }
    ]
  },
  easy: {
    label: "易",
    name: "简单内容",
    hint: "间隔拉长",
    summary: "当日 → 3天 → 7天 → 15天 → 30天",
    risk: "低负荷",
    nodes: [
      { label: "今", action: "快回忆", retention: 94 },
      { label: "3天", action: "抽检", retention: 82 },
      { label: "7天", action: "复盘", retention: 68 },
      { label: "15天", action: "巩固", retention: 54 },
      { label: "30天", action: "考前", retention: 42 }
    ]
  }
};

function getNextReviewDays(result: ReviewResult, streak: number) {
  if (result === "forgotten") return 1;
  if (result === "fuzzy") return 2;
  if (result === "wrong") return 0;
  return streak >= 1 ? 7 : 4;
}

function formatQuality(cards: StudyCard[]) {
  if (cards.length === 0) return 0;
  return Math.round(cards.reduce((total, card) => total + card.qualityScore, 0) / cards.length);
}

function getQualityReason(card: StudyCard) {
  if (card.qualityScore >= 92) return "单点清晰 · 有原文依据";
  if (card.qualityScore >= 86) return "可直接复习 · 建议快速确认";
  return "建议人工看一眼";
}

function getMaterialIcon(fileType?: Material["fileType"], name = "") {
  if (fileType === "audio" || fileType === "video" || name.endsWith(".m4a") || name.endsWith(".mp4")) {
    return <FileAudio size={18} />;
  }
  if (fileType === "pdf" || name.endsWith(".pdf")) {
    return <FileText size={18} />;
  }
  return <FileType size={18} />;
}

function withMaterialIcon(material: ApiMaterial): Material {
  return {
    ...material,
    icon: getMaterialIcon(material.fileType, material.name)
  };
}

function getMaterialTimeLabel(material: Material) {
  if (!material.uploadedAt) return "未知时间";

  const date = new Date(material.uploadedAt);

  if (Number.isNaN(date.getTime())) return "未知时间";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function getMaterialDayGroup(material: Material) {
  if (!material.uploadedAt) return "较早";

  const date = new Date(material.uploadedAt);
  if (Number.isNaN(date.getTime())) return "较早";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - thatDay) / 86_400_000);

  if (diffDays <= 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays <= 7) return "本周";
  return "更早";
}

function getMaterialExcerpt(material: Material) {
  const text = (material.rawText || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return material.sourceType === "paste" ? "粘贴原文已保存，等待解析内容补全。" : "源文件已保存，可继续生成卡片和知识架构。";
  return text.length > 82 ? `${text.slice(0, 82)}...` : text;
}

function getMaterialSourceHref(material: Material) {
  return `/api/materials/${material.id}/source`;
}

function makeEmptyReviewSession(): ReviewSession {
  return {
    queueIds: [],
    cursor: 0,
    roundTotal: 0,
    answeredInRound: 0,
    phase: "first",
    reinforceIds: [],
    completed: false,
    stats: {
      remembered: 0,
      fuzzy: 0,
      forgotten: 0,
      reinforced: 0
    }
  };
}

function getReviewPriority(card: StudyCard) {
  let score = 0;

  if (card.nextReviewInDays === 0) score += 60;
  if (card.lastResult === "forgotten") score += 32;
  if (card.lastResult === "fuzzy") score += 22;
  if (card.qualityScore < 86) score += 8;
  if (card.streak === 0) score += 6;

  return score;
}

function getDailyReviewPlan(activeCards: StudyCard[]): DailyReviewPlan {
  return getDailyReviewPlanWithCompleted(activeCards, new Set<number>());
}

function getDailyReviewPlanWithCompleted(activeCards: StudyCard[], completedTodayIds: Set<number>): DailyReviewPlan {
  const dueCards = activeCards.filter((card) => card.nextReviewInDays === 0 && !completedTodayIds.has(card.id));
  const weakDueCount = dueCards.filter((card) => card.lastResult === "forgotten" || card.lastResult === "fuzzy").length;
  const baseQuota = dueCards.length <= 10 ? dueCards.length : 14;
  const weakBoost = Math.min(6, weakDueCount * 2);
  const quota = Math.min(dueCards.length, Math.max(0, Math.min(24, baseQuota + weakBoost)));
  const cards = [...dueCards]
    .sort((a, b) => {
      const priorityDiff = getReviewPriority(b) - getReviewPriority(a);
      if (priorityDiff !== 0) return priorityDiff;
      return a.id - b.id;
    })
    .slice(0, quota);
  const backlogCount = Math.max(dueCards.length - cards.length, 0);
  const aiReason = backlogCount > 0
    ? `AI 已从 ${dueCards.length} 张到期卡中选出 ${cards.length} 张，优先处理忘记和模糊卡。`
    : cards.length > 0
      ? `今日 ${cards.length} 张已足够形成有效复习，不额外加压。`
      : "今天没有必须复习的卡片。";

  return {
    cards,
    dueCount: dueCards.length,
    quota,
    backlogCount,
    aiReason
  };
}

export default function HomePage() {
  const [view, setView] = useState<View>("review");
  const [cards, setCards] = useState<StudyCard[]>([...activeSeedCards, ...generatedSeedCards]);
  const [materialItems, setMaterialItems] = useState<Material[]>(materialSeed);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [parseStep, setParseStep] = useState<ParseStep>(-1);
  const [uploadMessage, setUploadMessage] = useState("");
  const [pendingMaterialId, setPendingMaterialId] = useState<number | null>(null);
  const [reviewSession, setReviewSession] = useState<ReviewSession>(() => makeEmptyReviewSession());
  const [completedTodayIds, setCompletedTodayIds] = useState<Set<number>>(() => new Set());
  const [answerVisible, setAnswerVisible] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [cardEditorBackView, setCardEditorBackView] = useState<View>("cardLibrary");
  const [cardLibraryInitialFilter, setCardLibraryInitialFilter] = useState<CardLibraryFilter>("all");

  const libraryCards = cards.filter((card) => card.status !== "deleted");
  const activeCards = cards.filter((card) => card.status === "active" || card.status === "edited" || card.status === "flagged");
  const generatedCards = cards.filter((card) => card.status === "generated");
  const dailyReviewPlan = useMemo(() => getDailyReviewPlanWithCompleted(activeCards, completedTodayIds), [activeCards, completedTodayIds]);
  const todayReviewCards = dailyReviewPlan.cards;
  const flaggedCards = activeCards.filter((card) => card.status === "flagged");
  const weakStudyCards = activeCards.filter((card) => card.lastResult === "forgotten" || card.lastResult === "fuzzy");
  const currentReviewCard = reviewSession.queueIds.length > 0
    ? cards.find((card) => card.id === reviewSession.queueIds[0]) ?? null
    : null;
  const sessionWeakCards = cards.filter((card) => reviewSession.reinforceIds.includes(card.id));
  const sheetCard = sheet ? cards.find((card) => card.id === sheet.cardId) ?? null : null;
  const editingCard = editingCardId ? cards.find((card) => card.id === editingCardId) ?? null : null;
  const pendingMaterial = pendingMaterialId ? materialItems.find((material) => material.id === pendingMaterialId && material.status !== "已解析") ?? null : null;
  const riskyReviewCount = activeCards.filter((card) => card.lastResult === "forgotten" || card.lastResult === "fuzzy").length;
  const aiDifficulty: ReviewDifficulty = riskyReviewCount >= 2 ? "hard" : todayReviewCards.length === 0 ? "easy" : "normal";

  useEffect(() => {
    let mounted = true;

    async function hydrateFromApi() {
      try {
        const [cardsResponse, materialsResponse, knowledgeResponse] = await Promise.all([
          fetch("/api/cards"),
          fetch("/api/materials"),
          fetch("/api/knowledge/graph")
        ]);
        const reviewResponse = await fetch("/api/review/today").catch(() => null);
        const cardsPayload = await cardsResponse.json() as { ok: boolean; cards?: StudyCard[] };
        const materialsPayload = await materialsResponse.json() as { ok: boolean; materials?: ApiMaterial[] };
        const knowledgePayload = await knowledgeResponse.json() as { ok: boolean; nodes?: KnowledgeNode[] };
        const reviewPayload = reviewResponse ? await reviewResponse.json() as { ok: boolean; cards?: StudyCard[] } : null;

        if (!mounted) return;

        if (cardsPayload.ok && Array.isArray(cardsPayload.cards)) {
          const apiCards = cardsPayload.cards;
          const apiActiveCards = apiCards.filter((card) => card.status === "active" || card.status === "edited" || card.status === "flagged");
          const apiDueCards = reviewPayload?.ok && Array.isArray(reviewPayload.cards) ? reviewPayload.cards : null;
          const apiPlan = apiDueCards
            ? {
                ...getDailyReviewPlanWithCompleted(apiActiveCards, new Set<number>()),
                cards: apiDueCards.slice(0, 24)
              }
            : getDailyReviewPlanWithCompleted(apiActiveCards, new Set<number>());
          setCards(apiCards);
          setCompletedTodayIds(new Set());
          setReviewSession({
            ...makeEmptyReviewSession(),
            queueIds: apiPlan.cards.map((card) => card.id),
            roundTotal: apiPlan.cards.length
          });
        }

        if (materialsPayload.ok && Array.isArray(materialsPayload.materials)) {
          setMaterialItems(materialsPayload.materials.map(withMaterialIcon));
        }

        if (knowledgePayload.ok && Array.isArray(knowledgePayload.nodes)) {
          setKnowledgeNodes(knowledgePayload.nodes);
        }

      } catch {
        // 本地 API 不可用时保留前端种子数据，方便继续看 Demo。
      }
    }

    void hydrateFromApi();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reviewSession.queueIds.length > 0 || reviewSession.completed || todayReviewCards.length === 0) return;

    setReviewSession({
      ...makeEmptyReviewSession(),
      queueIds: todayReviewCards.map((card) => card.id),
      roundTotal: todayReviewCards.length
    });
  }, [reviewSession.completed, reviewSession.queueIds.length, todayReviewCards]);

  const weekPlan = useMemo(
    () => [
      { label: "今", value: todayReviewCards.length },
      { label: "明", value: activeCards.filter((card) => card.nextReviewInDays === 1).length },
      { label: "3天", value: activeCards.filter((card) => card.nextReviewInDays === 2).length + 1 },
      { label: "7天", value: activeCards.filter((card) => card.nextReviewInDays === 7).length + 2 },
      { label: "14天", value: 1 }
    ],
    [activeCards, todayReviewCards.length]
  );

  function navigate(nextView: View) {
    setView(nextView);
    setAnswerVisible(false);
    setSheet(null);
  }

  function openCardLibrary(initialFilter: CardLibraryFilter = "all") {
    setCardLibraryInitialFilter(initialFilter);
    navigate("cardLibrary");
  }

  function persistCardPatch(cardId: number, patch: Partial<StudyCard>) {
    void fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patch)
    }).catch(() => undefined);
  }

  function persistCardFlag(cardId: number, reason?: string) {
    void fetch(`/api/cards/${cardId}/flag`, {
      method: "POST",
      headers: reason
        ? {
            "Content-Type": "application/json"
          }
        : undefined,
      body: reason ? JSON.stringify({ reason }) : undefined
    }).catch(() => undefined);
  }

  function refreshCards() {
    return fetch("/api/cards")
      .then((response) => response.json())
      .then((payload: { ok: boolean; cards?: StudyCard[] }) => {
        if (payload.ok && Array.isArray(payload.cards)) {
          setCards(payload.cards);
        }
      })
      .catch(() => undefined);
  }

  function refreshKnowledgeNodes() {
    return fetch("/api/knowledge/graph")
      .then((response) => response.json())
      .then((payload: { ok: boolean; nodes?: KnowledgeNode[] }) => {
        if (payload.ok && Array.isArray(payload.nodes)) {
          setKnowledgeNodes(payload.nodes);
        }
      })
      .catch(() => undefined);
  }

  function upsertMaterial(material: ApiMaterial) {
    const nextMaterial = withMaterialIcon(material);

    setMaterialItems((current) => [nextMaterial, ...current.filter((item) => item.id !== nextMaterial.id)]);
  }

  function importPastedContent(content: string) {
    setUploadMessage("");
    setParseStep(-1);

    if (!content.trim()) {
      setUploadMessage("先粘贴一段资料，再导入待拆解");
      return;
    }

    void fetch("/api/materials/paste", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    })
      .then((response) => response.json())
      .then((payload: { ok: boolean; material?: ApiMaterial }) => {
        if (payload.ok && payload.material) {
          upsertMaterial(payload.material);
          setPendingMaterialId(payload.material.id);
          setUploadMessage("粘贴资料已导入，点击开始拆解");
          return;
        }
        setUploadMessage("粘贴资料导入失败");
      })
      .catch(() => {
        setUploadMessage("粘贴资料导入失败");
      });
  }

  function startMaterialParse(materialId: number) {
    const progressTimers = [
      window.setTimeout(() => setParseStep(1), 700),
      window.setTimeout(() => setParseStep(2), 1400)
    ];

    setPendingMaterialId(materialId);
    setParseStep(0);
    setUploadMessage("AI 正在拆解资料");

    void fetch(`/api/materials/${materialId}/parse`, {
      method: "POST"
    })
      .then(async (response) => {
        const payload = await response.json() as { ok: boolean; material?: ApiMaterial; cards?: StudyCard[]; error?: string };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "资料拆解失败");
        }

        return payload;
      })
      .then((payload) => {
        if (payload.material) {
          upsertMaterial(payload.material);
        }

        if (Array.isArray(payload.cards) && payload.cards.length > 0) {
          const incomingCards = payload.cards as StudyCard[];
          const incomingIds = new Set(incomingCards.map((card) => card.id));

          setCards((current) => [...incomingCards, ...current.filter((card) => !incomingIds.has(card.id))]);
          setUploadMessage(`已生成 ${incomingCards.length} 张待确认卡片`);
        } else {
          setUploadMessage("资料已拆解，暂未生成新卡");
          void refreshCards();
        }

        setPendingMaterialId(null);
        setParseStep(3);
        void refreshKnowledgeNodes();
        window.setTimeout(() => navigate("cards"), 520);
      })
      .catch((error: unknown) => {
        setParseStep(-1);
        setUploadMessage(error instanceof Error ? `拆解失败：${error.message}` : "拆解失败：资料解析异常");
      })
      .finally(() => {
        progressTimers.forEach((timer) => window.clearTimeout(timer));
      });
  }

  function startFileUpload(file: File) {
    const formData = new FormData();

    formData.append("file", file);
    setParseStep(-1);
    setUploadMessage(`${file.name} 导入中`);

    void fetch("/api/materials/upload", {
      method: "POST",
      body: formData
    })
      .then(async (response) => {
        const payload = await response.json() as { ok: boolean; material?: ApiMaterial; cards?: StudyCard[]; error?: string };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "上传解析失败");
        }

        return payload;
      })
      .then((payload) => {
        if (payload.material) {
          upsertMaterial(payload.material);
          setPendingMaterialId(payload.material.id);
          setUploadMessage(`${file.name} 已导入，点击开始拆解`);
        } else {
          setUploadMessage("资料导入成功，但没有拿到资料记录");
        }
      })
      .catch((error: unknown) => {
        setParseStep(-1);
        setUploadMessage(error instanceof Error ? `上传失败：${error.message}` : "上传失败：文件导入异常");
      });
  }

  function approveAll() {
    void fetch("/api/cards/batch-approve", {
      method: "POST"
    }).catch(() => undefined);
    setCards((current) =>
      current.map((card) =>
        card.status === "generated"
          ? {
              ...card,
              status: "active",
              nextReviewInDays: 0
            }
          : card
      )
    );
  }

  function approveCard(cardId: number) {
    persistCardPatch(cardId, {
      status: "active",
      nextReviewInDays: 0
    });
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: "active",
              nextReviewInDays: 0
            }
          : card
      )
    );
  }

  function submitReview(result: ReviewResult) {
    if (!currentReviewCard) return;

    setCompletedTodayIds((current) => new Set([...current, currentReviewCard.id]));

    if (reviewSession.phase === "first") {
      void fetch(`/api/review/${currentReviewCard.id}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ result })
      })
        .then(() => {
          if (result === "fuzzy" || result === "forgotten") {
            return fetch("/api/ai/probes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                cardId: currentReviewCard.id,
                triggerResult: result
              })
            });
          }
          return null;
        })
        .catch(() => undefined);
    }

    setCards((current) =>
      current.map((card) => {
        if (card.id !== currentReviewCard.id) return card;
        return {
          ...card,
          status: result === "wrong" ? "flagged" : card.status,
          lastResult: result,
          nextReviewInDays: reviewSession.phase === "first" ? getNextReviewDays(result, card.streak) : card.nextReviewInDays,
          streak: reviewSession.phase === "first" && result === "remembered" ? card.streak + 1 : result === "remembered" ? card.streak : 0
        };
      })
    );

    setAnswerVisible(false);
    setReviewSession((current) => {
      const shouldReinforce = current.phase === "first" && (result === "forgotten" || result === "fuzzy");
      const reinforceIds = shouldReinforce && !current.reinforceIds.includes(currentReviewCard.id)
        ? [...current.reinforceIds, currentReviewCard.id]
        : current.reinforceIds;
      const remainingQueueIds = current.queueIds.filter((id, index) => index !== 0 && id !== currentReviewCard.id);
      const answeredInRound = current.answeredInRound + 1;
      const stats = {
        remembered: current.stats.remembered + (current.phase === "first" && result === "remembered" ? 1 : 0),
        fuzzy: current.stats.fuzzy + (current.phase === "first" && result === "fuzzy" ? 1 : 0),
        forgotten: current.stats.forgotten + (current.phase === "first" && result === "forgotten" ? 1 : 0),
        reinforced: current.stats.reinforced + (current.phase === "reinforce" ? 1 : 0)
      };

      if (remainingQueueIds.length > 0) {
        return {
          ...current,
          queueIds: remainingQueueIds,
          cursor: 0,
          answeredInRound,
          reinforceIds,
          stats
        };
      }

      if (current.phase === "first" && reinforceIds.length > 0) {
        return {
          ...current,
          queueIds: reinforceIds,
          cursor: 0,
          phase: "reinforce",
          reinforceIds,
          roundTotal: reinforceIds.length,
          answeredInRound: 0,
          stats
        };
      }

      return {
        ...current,
        queueIds: [],
        cursor: 0,
        reinforceIds,
        answeredInRound,
        completed: true,
        stats
      };
    });
  }

  function updateSheetCard(field: "question" | "answer", value: string) {
    if (!sheetCard) return;
    persistCardPatch(sheetCard.id, {
      [field]: value
    });
    setCards((current) =>
      current.map((card) =>
        card.id === sheetCard.id
          ? {
              ...card,
              [field]: value,
              status: card.status === "generated" ? "generated" : "edited"
            }
          : card
      )
    );
  }

  function updateCardInline(cardId: number, field: "question" | "answer", value: string) {
    persistCardPatch(cardId, {
      [field]: value
    });
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              [field]: value,
              status: card.status === "generated" ? "generated" : "edited"
            }
          : card
      )
    );
  }

  function openCardEditor(cardId: number, backView: View = "cardLibrary") {
    setEditingCardId(cardId);
    setCardEditorBackView(backView);
    navigate("cardEditor");
  }

  function flagCard(cardId: number) {
    persistCardFlag(cardId);
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: "flagged",
              flaggedReason: card.flaggedReason || "待选择问题原因"
            }
          : card
      )
    );
    setSheet({ type: "feedback", cardId });
  }

  function toggleCardFlag(cardId: number) {
    persistCardFlag(cardId);
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: card.status === "flagged" ? "active" : "flagged",
              flaggedReason: card.status === "flagged" ? "" : card.flaggedReason || "复习时标记待检查"
            }
          : card
      )
    );
  }

  function toggleCardFavorite(cardId: number) {
    const target = cards.find((card) => card.id === cardId);
    const nextFavorite = !target?.isFavorite;

    persistCardPatch(cardId, {
      isFavorite: nextFavorite
    });
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              isFavorite: nextFavorite
            }
          : card
      )
    );
  }

  function submitCardFeedback(cardId: number, reason: string) {
    persistCardFlag(cardId, reason);
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              status: "flagged",
              flaggedReason: reason
            }
          : card
      )
    );
    setSheet(null);
  }

  function rewriteCard(cardId: number, reason?: string) {
    setUploadMessage("AI 正在优化卡片");
    void fetch(`/api/cards/${cardId}/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reason })
    })
      .then((response) => response.json())
      .then((payload: { ok: boolean; card?: StudyCard }) => {
        if (payload.ok && payload.card) {
          setCards((current) => current.map((card) => (card.id === cardId ? payload.card as StudyCard : card)));
          setUploadMessage("AI 已优化卡片");
          window.setTimeout(() => setUploadMessage(""), 1600);
        } else {
          setUploadMessage("AI 优化失败，保留原卡");
        }
      })
      .catch(() => {
        setUploadMessage("AI 优化失败，保留原卡");
      });
  }

  return (
    <main className="appShell">
      <section className="phoneFrame" aria-label="药考速记移动端原型">
        <StatusBar />
        <TopBar />
        <div className="screenBody">
          {view === "progress" && (
            <ProgressView
              dueCount={todayReviewCards.length}
              flaggedCount={weakStudyCards.length}
              aiDifficulty={aiDifficulty}
              weekPlan={weekPlan}
              backlogCount={dailyReviewPlan.backlogCount}
              aiReason={dailyReviewPlan.aiReason}
              onStartReview={() => navigate("review")}
              onOpenWeakCards={() => navigate("weakCoach")}
            />
          )}
          {view === "upload" && (
            <UploadView
              parseStep={parseStep}
              uploadMessage={uploadMessage}
              pendingMaterial={pendingMaterial}
              onImportPaste={importPastedContent}
              onStartParse={startMaterialParse}
              onStartFileUpload={startFileUpload}
            />
          )}
          {view === "cards" && (
            <CardsView
              generatedCards={generatedCards}
              averageQuality={formatQuality(generatedCards)}
              onApproveCard={approveCard}
              onApproveAll={approveAll}
              onEdit={(cardId) => setSheet({ type: "edit", cardId })}
              onFlag={flagCard}
            />
          )}
          {view === "review" && (
            <ReviewView
              card={currentReviewCard}
              answerVisible={answerVisible}
              current={Math.min(reviewSession.answeredInRound + 1, Math.max(reviewSession.roundTotal || reviewSession.queueIds.length, 1))}
              total={reviewSession.roundTotal || reviewSession.queueIds.length}
              phase={reviewSession.phase}
              completed={reviewSession.completed}
              summary={reviewSession.stats}
              weakCards={sessionWeakCards}
              aiReason={dailyReviewPlan.aiReason}
              backlogCount={dailyReviewPlan.backlogCount}
              onFlip={() => setAnswerVisible((current) => !current)}
              onSubmit={submitReview}
              onFlag={toggleCardFlag}
              onFavorite={toggleCardFavorite}
              onDone={() => navigate("progress")}
              onOpenWeakCards={() => navigate("weakCoach")}
            />
          )}
          {view === "project" && (
            <ProjectView
              materials={materialItems}
              cards={libraryCards}
              generatedCount={generatedCards.length}
              onMaterials={() => navigate("materialList")}
              onCardLibrary={() => openCardLibrary("all")}
              onKnowledge={() => navigate("knowledgeBase")}
              onCards={() => navigate("cards")}
              onUpload={() => navigate("upload")}
            />
          )}
          {view === "materialList" && (
            <MaterialListView
              materials={materialItems}
              onBack={() => navigate("project")}
            />
          )}
          {view === "cardLibrary" && (
            <CardLibraryView cards={libraryCards} initialFilter={cardLibraryInitialFilter} onBack={() => navigate("project")} onOpenCard={openCardEditor} />
          )}
          {view === "cardEditor" && (
            <CardEditorView
              card={editingCard}
              onBack={() => navigate(cardEditorBackView)}
              onQuestionChange={(value) => editingCard && updateCardInline(editingCard.id, "question", value)}
              onAnswerChange={(value) => editingCard && updateCardInline(editingCard.id, "answer", value)}
              onRewrite={(reason) => editingCard && rewriteCard(editingCard.id, reason)}
            />
          )}
          {view === "knowledgeBase" && (
            <KnowledgeBaseView
              materials={materialItems}
              cards={libraryCards}
              nodes={knowledgeNodes}
              onBack={() => navigate("project")}
              onOpenCard={(cardId) => openCardEditor(cardId, "knowledgeBase")}
            />
          )}
          {view === "weakCoach" && (
            <WeakCoachView
              cards={weakStudyCards.length > 0 ? weakStudyCards : sessionWeakCards}
              onBack={() => navigate("review")}
              onOpenCard={openCardEditor}
              onFavorite={toggleCardFavorite}
            />
          )}
          {view === "profile" && (
            <ProfileView
            />
          )}
        </div>
        <BottomNav view={view} generatedCount={generatedCards.length} onNavigate={navigate} />
        {sheet && sheetCard && (
          <BottomSheet
            sheet={sheet}
            card={sheetCard}
            onClose={() => setSheet(null)}
            onQuestionChange={(value) => updateSheetCard("question", value)}
            onAnswerChange={(value) => updateSheetCard("answer", value)}
            onFeedback={(reason) => submitCardFeedback(sheetCard.id, reason)}
            onRewrite={(reason) => rewriteCard(sheetCard.id, reason)}
          />
        )}
      </section>
    </main>
  );
}

function StatusBar() {
  return (
    <div className="statusBar" aria-hidden="true">
      <span>9:41</span>
      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="topBar">
      <div className="brandLockup">
        <Pill size={19} />
        <span>药考速记</span>
        {isPublicDemo ? <em>作品集 Demo</em> : null}
      </div>
    </header>
  );
}

function ProgressView({
  dueCount,
  flaggedCount,
  aiDifficulty,
  weekPlan,
  backlogCount,
  aiReason,
  onStartReview,
  onOpenWeakCards
}: {
  dueCount: number;
  flaggedCount: number;
  aiDifficulty: ReviewDifficulty;
  weekPlan: { label: string; value: number }[];
  backlogCount: number;
  aiReason: string;
  onStartReview: () => void;
  onOpenWeakCards: () => void;
}) {
  const [progressTab, setProgressTab] = useState<"curve" | "study" | "memory">("curve");
  const progressTabs = [
    { key: "curve", label: "遗忘曲线" },
    { key: "study", label: "学习情况" },
    { key: "memory", label: "记忆持久度" }
  ] as const;
  const totalWeek = weekPlan.reduce((sum, item) => sum + item.value, 0);
  const maxWeekValue = Math.max(...weekPlan.map((item) => item.value), 1);

  return (
    <div className="page oneScreen homePage">
      <section className="progressShell glassPanel">
        <div className="progressTabs">
          {progressTabs.map((tab) => (
            <button className={progressTab === tab.key ? "active" : ""} key={tab.key} onClick={() => setProgressTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {progressTab === "curve" && (
          <div className="progressPanel curvePanel">
            <ForgettingCurve data={weekPlan} recommendedDifficulty={aiDifficulty} flaggedCount={flaggedCount} backlogCount={backlogCount} />
          </div>
        )}

        {progressTab === "study" && (
          <div className="progressPanel studyPanel">
            <div className="barChart" aria-label="近一周学习情况">
              {weekPlan.map((item, index) => (
                <span
                  key={item.label}
                  style={
                    {
                      "--bar": `${item.value === 0 ? 8 : 22 + (item.value / maxWeekValue) * 58}%`,
                      "--bar-delay": `${index * 55}ms`
                    } as CSSProperties
                  }
                >
                  <i />
                  <b>{item.label}</b>
                </span>
              ))}
            </div>
            <div className="studyLegend">
              <span>本周排期 {totalWeek} 张</span>
              <span>今日时长 18 分</span>
              <span>薄弱卡 {flaggedCount} 张</span>
            </div>
          </div>
        )}

        {progressTab === "memory" && (
          <div className="progressPanel memoryPanel">
            <div className="memoryLines" aria-label="记忆持久度">
              <span className="memoryLine all" />
              <span className="memoryLine stable" />
              <span className="memoryLine long" />
            </div>
            <div className="memoryLegend">
              <span><i className="all" /> 已入库卡片 7</span>
              <span><i className="stable" /> 稳定记忆 4</span>
              <span><i className="long" /> 长期保持 2</span>
            </div>
          </div>
        )}

      </section>

      <section className="progressActionPanel glassPanel">
        <button className="progressStartButton" onClick={onStartReview} type="button">
          <BookOpenCheck size={18} />
          <span>
            <strong>{dueCount > 0 ? `开始 ${dueCount} 张复习` : "查看今日复习"}</strong>
            <small>{aiReason}</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <div className="progressQuickActions">
          <button onClick={onOpenWeakCards} type="button">
            <Flag size={15} />
            <span>{flaggedCount > 0 ? `${flaggedCount} 张薄弱卡` : "暂无薄弱卡"}</span>
          </button>
          <button onClick={() => setProgressTab("study")} type="button">
            <CalendarDays size={15} />
            <span>{backlogCount > 0 ? `${backlogCount} 张待排` : `本周 ${totalWeek} 张`}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ForgettingCurve({
  data,
  recommendedDifficulty,
  flaggedCount,
  backlogCount
}: {
  data: { label: string; value: number }[];
  recommendedDifficulty: ReviewDifficulty;
  flaggedCount: number;
  backlogCount: number;
}) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<ReviewDifficulty>(recommendedDifficulty);
  const profile = reviewProfiles[selectedDifficulty];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxLoad = Math.max(...data.map((item) => item.value), 1);
  const chartTop = 22;
  const chartBottom = 136;
  const chartHeight = chartBottom - chartTop;
  const difficultyBase = selectedDifficulty === "hard" ? 88 : selectedDifficulty === "normal" ? 92 : 95;
  const difficultyDrop = selectedDifficulty === "hard" ? 8.6 : selectedDifficulty === "normal" ? 7.1 : 5.8;
  const weakPenalty = Math.min(14, flaggedCount * 3 + backlogCount * 2);
  const labelToDays = (label: string) => {
    if (label === "今") return 0;
    if (label === "明") return 1;
    const match = label.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };
  const points = data.map((item, index) => {
    const days = labelToDays(item.label);
    const loadRatio = item.value / maxLoad;
    const loadPenalty = Math.round(loadRatio * 7);
    const retention = Math.max(34, Math.min(96, Math.round(difficultyBase - Math.sqrt(days) * difficultyDrop - loadPenalty - weakPenalty)));
    const x = 28 + (index * 284) / Math.max(data.length - 1, 1);
    const y = chartTop + ((96 - retention) / 62) * chartHeight;
    const radius = 4.5 + loadRatio * 3;

    return {
      ...item,
      days,
      retention,
      x,
      y: Math.max(chartTop, Math.min(chartBottom, y)),
      radius
    };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.x || 312} ${chartBottom} L ${points[0]?.x || 28} ${chartBottom} Z`;
  const summary = flaggedCount > 0
    ? `${flaggedCount} 张薄弱卡会拉低保持率，建议优先回看。`
    : backlogCount > 0
      ? `${backlogCount} 张待排卡需要压到下一轮。`
      : "当前排期平稳，可以按节奏复习。";

  return (
    <div className="forgetCurve" aria-label="基于实际排期的遗忘曲线">
      <div className="curveHead">
        <span>
          <Sparkles size={13} />
          实际排期预测
        </span>
        <strong>本周 {total} 张</strong>
      </div>
      <div className="curveModeSwitch" aria-label="按内容难度查看复习间隔">
        {(Object.keys(reviewProfiles) as ReviewDifficulty[]).map((key) => {
          const item = reviewProfiles[key];
          return (
            <button className={selectedDifficulty === key ? "active" : ""} key={key} onClick={() => setSelectedDifficulty(key)} aria-pressed={selectedDifficulty === key}>
              <b>{item.label}</b>
              {recommendedDifficulty === key && <i>AI</i>}
            </button>
          );
        })}
      </div>
      <div className="curveCanvas">
        <svg viewBox="0 0 340 158" role="img" aria-label={`${profile.name}下的实际排期与预计保持率`}>
          <defs>
            <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(14,116,144,0.28)" />
              <stop offset="62%" stopColor="rgba(14,116,144,0.1)" />
              <stop offset="100%" stopColor="rgba(14,116,144,0)" />
            </linearGradient>
            <filter id="curveGlow" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0.05 0 0 0 0 0.45 0 0 0 0 0.56 0 0 0 0.38 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path className="curveGrid" d="M24 28 H318 M24 64 H318 M24 100 H318 M24 136 H318" />
          <path className="curveAxis" d="M24 22 V136 H318" />
          <path className="curveArea" d={areaPath} />
          <path className="curveLineShadow" d={path} />
          <path className="curveLine" d={path} filter="url(#curveGlow)" />
          {points.map((point, index) => (
            <g className="curveNode" key={`${point.label}-${point.retention}`} style={{ "--node-delay": `${index * 72}ms` } as CSSProperties}>
              <circle className="curveNodeHalo" cx={point.x} cy={point.y} r={point.radius + 4} />
              <circle cx={point.x} cy={point.y} r={point.radius} />
              <text className="curveValue" x={point.x} y={point.y - 13}>{point.retention}%</text>
              <text className="curveLoadText" x={point.x} y="138">{point.value}张</text>
              <text className="curveTick" x={point.x} y="152">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="curveRhythm" aria-label="曲线说明">
        <span className="now">点=排期</span>
        <span>线=保持率</span>
        <span>{summary}</span>
      </div>
    </div>
  );
}

function UploadView({
  parseStep,
  uploadMessage,
  pendingMaterial,
  onImportPaste,
  onStartParse,
  onStartFileUpload
}: {
  parseStep: ParseStep;
  uploadMessage: string;
  pendingMaterial: Material | null;
  onImportPaste: (content: string) => void;
  onStartParse: (materialId: number) => void;
  onStartFileUpload: (file: File) => void;
}) {
  const [pasteContent, setPasteContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const isParsing = parseStep >= 0 && parseStep < 3;
  const primaryLabel = isParsing ? "拆解中" : pendingMaterial ? "开始拆解" : "导入粘贴资料";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFileName(file.name);
    onStartFileUpload(file);
    event.target.value = "";
  }

  return (
    <div className="page oneScreen uploadPage">
      <section className="uploadMethods">
        <label className="uploadHero glassPanel">
          <input aria-label="选择资料" type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
          <span className="uploadMark">
            <Upload size={24} />
          </span>
          <strong>导入课程资料</strong>
          <small>{pendingMaterial?.sourceType === "upload" ? `${pendingMaterial.name} 待拆解` : selectedFileName || `支持 PDF / docx / txt${isPublicDemo ? ` · 单文件不超过 ${demoMaxUploadMb}MB` : "，选中后先进入待拆解"}`}</small>
        </label>

        <section className="pasteUploadCard glassPanel">
          <div>
            <Sparkles size={18} />
            <strong>粘贴内容</strong>
          </div>
          <textarea
            aria-label="粘贴课程内容"
            placeholder="直接粘贴药理笔记、处方审核错题、药事法规摘要..."
            value={pasteContent}
            onChange={(event) => setPasteContent(event.target.value)}
          />
          <span>{pendingMaterial?.sourceType === "paste" ? `${pendingMaterial.name} 待拆解` : pasteContent.trim() ? `${pasteContent.trim().length} 字可导入` : "粘贴后先保存为待拆解资料"}</span>
        </section>
      </section>

      <section className="parsePanel glassPanel">
        {parseStages.map((stage, index) => (
          <div className={parseStep >= index ? "complete" : parseStep === index - 1 ? "next" : ""} key={stage}>
            <i>{parseStep > index ? <Check size={12} /> : index + 1}</i>
            <span>{stage}</span>
          </div>
        ))}
      </section>

      <button
        className="primaryAction"
        disabled={isParsing}
        onClick={() => pendingMaterial ? onStartParse(pendingMaterial.id) : onImportPaste(pasteContent)}
      >
        {isParsing ? <RotateCcw className="spinIcon" size={18} /> : <Sparkles size={18} />}
        {primaryLabel}
      </button>
      {uploadMessage ? <span className="uploadStatusText">{uploadMessage}</span> : null}
    </div>
  );
}

function CardsView({
  generatedCards,
  averageQuality,
  onApproveCard,
  onApproveAll,
  onEdit,
  onFlag
}: {
  generatedCards: StudyCard[];
  averageQuality: number;
  onApproveCard: (cardId: number) => void;
  onApproveAll: () => void;
  onEdit: (cardId: number) => void;
  onFlag: (cardId: number) => void;
}) {
  const primaryCard = generatedCards[0] ?? null;
  const remainingCount = Math.max(generatedCards.length - 1, 0);

  return (
    <div className="page oneScreen cardsPage">
      <section className="scorePanel glassPanel">
        <div>
          <span>本次生成</span>
          <strong>{generatedCards.length} 张速记卡</strong>
        </div>
        <button className="approveAllMini" onClick={onApproveAll} disabled={generatedCards.length === 0}>
          全部通过
        </button>
        <div className="qualityRing">
          <b>{averageQuality}</b>
          <small>质量分</small>
        </div>
      </section>

      <section className="previewStack" aria-label="卡片预览">
        {generatedCards.length === 0 ? (
          <div className="emptyPreview glassPanel">
            <ShieldCheck size={24} />
            <strong>新卡已全部加入复习</strong>
            <span>可以直接开始今日复习。</span>
          </div>
        ) : (
          <>
            {generatedCards.slice(1, 3).map((card, index) => (
              <div aria-hidden="true" className={`previewBackplate depth${index + 1}`} key={card.id} />
            ))}
            {primaryCard && (
              <article className="memoryPreview glassPanel">
                <div className="cardHeaderLine">
                  <span>{primaryCard.type}</span>
                  <b>{primaryCard.qualityScore} · {getQualityReason(primaryCard)}</b>
                </div>
                {remainingCount > 0 && <span className="remainingBadge">还有 {remainingCount} 张待确认</span>}
                <h2>{primaryCard.question}</h2>
                <p>{primaryCard.answer}</p>
                <div className="evidenceBox">
                  <span>原文依据</span>
                  <small>{primaryCard.evidence}</small>
                </div>
                <div className="lawLine">
                  <Pill size={15} />
                  <span>{primaryCard.knowledgeRef}</span>
                </div>
                <div className="inlineActions">
                  <button className="cardPassAction" onClick={() => onApproveCard(primaryCard.id)}>
                    <Check size={17} />
                    通过
                  </button>
                  <div className="cardReviewTools" aria-label="人工调整">
                    <button onClick={() => onEdit(primaryCard.id)} aria-label="编辑卡片">
                      <Edit3 size={15} />
                    </button>
                    <button className="danger" onClick={() => onFlag(primaryCard.id)} aria-label="反馈不对">
                      <Flag size={15} />
                    </button>
                  </div>
                </div>
              </article>
            )}
          </>
        )}
      </section>

    </div>
  );
}

function ReviewView({
  card,
  current,
  total,
  answerVisible,
  phase,
  completed,
  summary,
  weakCards,
  aiReason,
  backlogCount,
  onFlip,
  onSubmit,
  onFlag,
  onFavorite,
  onDone,
  onOpenWeakCards
}: {
  card: StudyCard | null;
  current: number;
  total: number;
  answerVisible: boolean;
  phase: ReviewPhase;
  completed: boolean;
  summary: ReviewSession["stats"];
  weakCards: StudyCard[];
  aiReason: string;
  backlogCount: number;
  onFlip: () => void;
  onSubmit: (result: ReviewResult) => void;
  onFlag: (cardId: number) => void;
  onFavorite: (cardId: number) => void;
  onDone: () => void;
  onOpenWeakCards: () => void;
}) {
  const [feedback, setFeedback] = useState<"remembered" | "forgotten" | "fuzzy" | null>(null);
  const [flagNotice, setFlagNotice] = useState("");

  function handleReviewSubmit(result: ReviewResult) {
    if (feedback) return;

    if (result !== "remembered" && result !== "forgotten" && result !== "fuzzy") {
      onSubmit(result);
      return;
    }

    setFeedback(result);
    window.setTimeout(() => {
      setFeedback(null);
      onSubmit(result);
    }, 430);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (feedback) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onFlip();
    }
  }

  function handleFlagClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (feedback || !card) return;
    const willMark = card.status !== "flagged";
    onFlag(card.id);
    setFlagNotice(willMark ? "已标记问题，可在资料-卡片中修改" : "已取消标记");
    window.setTimeout(() => setFlagNotice(""), 1800);
  }

  function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (feedback || !card) return;
    onFavorite(card.id);
    setFlagNotice(card.isFavorite ? "已取消收藏" : "已收藏为重点");
    window.setTimeout(() => setFlagNotice(""), 1600);
  }

  if (!card) {
    return (
      <div className="page oneScreen donePage">
        <section className="doneCard reviewSummaryCard glassPanel">
          <ShieldCheck size={34} />
          <h2>{completed ? "本轮完成" : "今日完成"}</h2>
          <p>
            {completed
              ? "忘记和模糊的卡片已完成本轮加强，后续会进入 AI 调整后的复习排期。"
              : "没有待复习卡片，薄弱点会进入下一轮排期。"}
          </p>
          <div className="reviewSummaryStats">
            <span>
              <b>{summary.forgotten}</b>
              忘记
            </span>
            <span>
              <b>{summary.fuzzy}</b>
              模糊
            </span>
            <span>
              <b>{summary.reinforced}</b>
              已加强
            </span>
          </div>
          {weakCards.length > 0 && (
            <div className="reviewAiDigest">
              <span>
                <Sparkles size={14} />
                AI 已记录薄弱卡
              </span>
              <strong>{weakCards.length} 张需要重点复习</strong>
              <small>点击“看薄弱卡”，由 AI 逐张给出记忆入口和易混提醒。</small>
            </div>
          )}
        </section>
        <div className="doneActions">
          <button className="secondaryAction" onClick={onOpenWeakCards} disabled={weakCards.length === 0}>
            <Brain size={17} />
            看薄弱卡
          </button>
          <button className="primaryAction" onClick={onDone}>
            <BookOpenCheck size={18} />
            看进度
          </button>
        </div>
      </div>
    );
  }

  const cardTypeTone = card.type === "填空" ? "cloze" : card.type === "判断" ? "judge" : "qa";

  return (
    <div className={`page oneScreen reviewPage ${feedback ? `feedback-${feedback}` : ""}`}>
      <div className="reviewTopLine">
        <span>
          {phase === "reinforce" ? "加强" : "首次"} {current}/{Math.max(total, 1)}
        </span>
        <div>
          <i style={{ width: `${Math.max((current / Math.max(total, 1)) * 100, 12)}%` }} />
        </div>
      </div>

      <div
        aria-disabled={Boolean(feedback)}
        className={`flipCard ${answerVisible ? "flipped" : ""} ${feedback ? `feedback-${feedback}` : ""}`}
        key={card.id}
        onClick={feedback ? undefined : onFlip}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={feedback ? -1 : 0}
      >
        <article className="flipFace front glassPanel">
          <div className="reviewCardTop">
            <span className={`cardType ${cardTypeTone}`}>{card.type}</span>
            <small>{phase === "reinforce" ? "本轮薄弱回看" : card.tags.slice(0, 2).join(" · ")}</small>
          </div>
          <h2>{card.question}</h2>
          <div className="flipHintRow">
            <small>轻点翻面查看答案</small>
            <div className="reviewInlineTools">
              <button
                aria-label={card.status === "flagged" ? "取消标记不准" : "标记这张卡不准，之后可修改"}
                className={`reviewFlagButton ${card.status === "flagged" ? "active" : ""}`}
                onClick={handleFlagClick}
                type="button"
              >
                <Flag size={15} />
              </button>
              <button
                aria-label={card.isFavorite ? "取消收藏重点" : "收藏为重点"}
                className={`reviewFlagButton favorite ${card.isFavorite ? "active" : ""}`}
                onClick={handleFavoriteClick}
                type="button"
              >
                <Star size={15} />
              </button>
            </div>
          </div>
          <span className={`flagNotice ${flagNotice ? "show" : ""}`}>{flagNotice || "旗标=不准待修，星标=重点收藏"}</span>
        </article>
        <article className="flipFace back glassPanel">
          <div className="reviewCardTop">
            <span className="cardType source">{card.knowledgeRef}</span>
            <small>{card.source} · P{card.sourcePage}</small>
          </div>
          <p>{card.answer}</p>
          <small>轻点回到题面</small>
        </article>
        <span className="reviewSignal">
          {feedback === "remembered" && <Check size={18} />}
          {feedback === "forgotten" && <X size={18} />}
          {feedback === "fuzzy" && <Clock3 size={18} />}
          {feedback === "remembered" && "已记住"}
          {feedback === "forgotten" && "加入薄弱复习"}
          {feedback === "fuzzy" && "需巩固"}
        </span>
      </div>

      <div className={`reviewQuotaHint ${phase === "reinforce" ? "warm" : ""}`}>
        <Sparkles size={13} />
        <span>
          {phase === "reinforce"
            ? "这些是本轮忘记和模糊的卡，回看完成后再进入遗忘曲线排期。"
            : backlogCount > 0
              ? aiReason
              : "AI 已控制今日复习量，完成后会根据结果调整下一次出现时间。"}
        </span>
      </div>

      <div className="reviewControls">
        <button className="danger" onClick={() => handleReviewSubmit("forgotten")} disabled={Boolean(feedback)}>
          <X size={18} />
          忘记
        </button>
        <button className="warning" onClick={() => handleReviewSubmit("fuzzy")} disabled={Boolean(feedback)}>
          <Clock3 size={18} />
          模糊
        </button>
        <button className="success" onClick={() => handleReviewSubmit("remembered")} disabled={Boolean(feedback)}>
          <Check size={18} />
          记住
        </button>
      </div>
    </div>
  );
}

function makeMemoryCoach(card: StudyCard) {
  const compactAnswer = card.answer.replace(/\s+/g, " ").slice(0, 86);
  const keyTags = card.tags.length > 0 ? card.tags.slice(0, 3).join("、") : card.knowledgeRef;
  const weakReason = card.lastResult === "forgotten"
    ? "这张卡不是再看一遍就够，先把答案压成一个能脱口而出的短句。"
    : card.lastResult === "fuzzy"
      ? "你已经有印象了，重点是把边界词和触发条件钉牢。"
      : "这张卡被纳入薄弱回看，先用一句话重建记忆入口。";

  return {
    weakReason,
    hook: `先记「${compactAnswer || card.question.slice(0, 24)}」`,
    contrast: card.type === "填空"
      ? "遮住空格前后的限定词，只背关键词，再反向说出完整句。"
      : `把它和「${keyTags}」里的相近点对比，避免只记结论不记条件。`,
    nextMove: card.isFavorite
      ? "已收藏为重点，下一轮优先回看。"
      : "如果这是考试高频点，可以点星标收藏为重点。"
  };
}

function WeakCoachView({
  cards,
  onBack,
  onOpenCard,
  onFavorite
}: {
  cards: StudyCard[];
  onBack: () => void;
  onOpenCard: (cardId: number, backView?: View) => void;
  onFavorite: (cardId: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(cards.length - 1, 0));
  const card = cards[safeIndex] ?? null;
  const coach = card ? makeMemoryCoach(card) : null;

  if (!card || !coach) {
    return (
      <div className="page oneScreen weakCoachPage">
        <DetailHeader title="薄弱卡" onBack={onBack} />
        <section className="doneCard glassPanel">
          <ShieldCheck size={32} />
          <h2>暂无薄弱卡</h2>
          <p>复习时点“模糊”或“忘记”后，这里会生成逐张记忆建议。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page oneScreen weakCoachPage">
      <DetailHeader title="薄弱卡" onBack={onBack} />
      <section className="weakCoachHero glassPanel">
        <div>
          <span>
            <Sparkles size={15} />
            AI 辅助记清
          </span>
          <h2>{safeIndex + 1}/{cards.length}</h2>
        </div>
        <p>{coach.weakReason}</p>
      </section>

      <section className="weakCoachCard glassPanel">
        <div className="reviewCardTop">
          <span className="cardType qa">{card.lastResult === "forgotten" ? "忘记" : "模糊"}</span>
          <small>{card.source}</small>
        </div>
        <h3>{card.question}</h3>
        <p>{card.answer}</p>
      </section>

      <section className="memorySteps">
        <button type="button" onClick={() => onOpenCard(card.id, "weakCoach")}>
          <Brain size={17} />
          <span>
            <strong>怎么记</strong>
            <small>{coach.hook}</small>
          </span>
        </button>
        <button type="button" onClick={() => onOpenCard(card.id, "weakCoach")}>
          <CircleAlert size={17} />
          <span>
            <strong>别混淆</strong>
            <small>{coach.contrast}</small>
          </span>
        </button>
        <button type="button" onClick={() => onFavorite(card.id)}>
          <Star size={17} />
          <span>
            <strong>{card.isFavorite ? "已收藏" : "收藏重点"}</strong>
            <small>{coach.nextMove}</small>
          </span>
        </button>
      </section>

      <div className="weakCoachActions">
        <button className="secondaryAction" onClick={() => setIndex(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0}>
          上一个
        </button>
        <button className="primaryAction" onClick={() => setIndex(Math.min(cards.length - 1, safeIndex + 1))} disabled={safeIndex >= cards.length - 1}>
          下一个点
        </button>
      </div>
    </div>
  );
}

function AssetStatButton({
  label,
  value,
  icon,
  primary = false,
  onClick
}: {
  label: string;
  value: string;
  icon: ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`assetStatButton glassPanel ${primary ? "primary" : ""}`} onClick={onClick}>
      <span className="assetIcon">{icon}</span>
      <span>
        <b>{label}</b>
      </span>
      <strong>{value}</strong>
    </button>
  );
}

function ProjectView({
  materials,
  cards,
  generatedCount,
  onMaterials,
  onCardLibrary,
  onKnowledge,
  onCards,
  onUpload
}: {
  materials: Material[];
  cards: StudyCard[];
  generatedCount: number;
  onMaterials: () => void;
  onCardLibrary: () => void;
  onKnowledge: () => void;
  onCards: () => void;
  onUpload: () => void;
}) {
  const pendingMaterials = materials.filter((material) => material.status !== "已解析").length;

  return (
    <div className="page oneScreen projectPage">
      <section className="assetDashboard">
        <button className="materialCoverCard glassPanel" onClick={onMaterials}>
          <span className="materialLawTexture" aria-hidden="true" />
          <div className="fileStackPreview" aria-hidden="true">
            <span className="filePane pdf">
              <b>PDF</b>
              <small>2</small>
            </span>
            <span className="filePane doc">
              <b>DOC</b>
              <small>1</small>
            </span>
            <span className="filePane audio">
              <b>AUD</b>
              <small>1</small>
            </span>
          </div>
          <div className="materialCoverCopy">
            <span>资料目录</span>
            <strong>{materials.length} 份资料</strong>
          </div>
          <span className="materialOpenOrb" aria-hidden="true">
            <ChevronRight size={20} />
          </span>
        </button>
        <div className="assetSecondary">
          <AssetStatButton
            icon={<Layers3 size={18} />}
            label="卡片"
            value={cards.length.toString()}
            onClick={onCardLibrary}
          />
          <AssetStatButton
            icon={<Network size={18} />}
            label="知识"
            value="1"
            onClick={onKnowledge}
          />
        </div>
      </section>
      <button className="materialNotice glassPanel" onClick={generatedCount > 0 ? onCards : onUpload}>
        <Layers3 size={19} />
        <span>{generatedCount > 0 ? `${generatedCount} 张新卡待确认` : pendingMaterials > 0 ? `${pendingMaterials} 份资料待拆解` : "上传后手动拆解出卡"}</span>
        <ChevronRight size={17} />
      </button>
      <button className="primaryAction" onClick={onUpload}>
        <Upload size={18} />
        上传资料
      </button>
    </div>
  );
}

function MaterialListView({
  materials,
  onBack
}: {
  materials: Material[];
  onBack: () => void;
}) {
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const sortedMaterials = [...materials].sort((a, b) => {
    const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    return timeB - timeA;
  });
  const groupedMaterials = ["今天", "昨天", "本周", "更早", "较早"]
    .map((day) => ({
      day,
      items: sortedMaterials.filter((material) => getMaterialDayGroup(material) === day)
    }))
    .filter((group) => group.items.length > 0);

  function handleSwipeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    };
  }

  function handleSwipeEnd(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = Date.now() - start.time;

    if (dx > 72 && Math.abs(dy) < 46 && elapsed < 850) {
      onBack();
    }
  }

  return (
    <div className="page oneScreen detailPage materialDetailPage" onPointerDown={handleSwipeStart} onPointerUp={handleSwipeEnd} onPointerCancel={() => { swipeStartRef.current = null; }}>
      <DetailHeader title="资料目录" onBack={onBack} />
      <section className="materialWaterfall">
        <div className="materialTimeline">
          {groupedMaterials.map((group) => (
            <div className="materialDayGroup" key={group.day}>
              <span>{group.day}</span>
              {group.items.map((material) => (
                <a
                  aria-label={`打开原文件：${material.name}`}
                  className="sourceFileCard"
                  href={getMaterialSourceHref(material)}
                  key={material.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="filePreviewIcon">{material.icon}</span>
                  <span>
                    <strong>{material.name}</strong>
                    <small>{getMaterialExcerpt(material)}</small>
                  </span>
                  <span className="fileMetaLine">
                    <small>{getMaterialTimeLabel(material)}</small>
                    <em>{material.status}</em>
                    <ExternalLink className="openFileIcon" size={14} aria-hidden="true" />
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CardLibraryView({
  cards,
  initialFilter,
  onBack,
  onOpenCard
}: {
  cards: StudyCard[];
  initialFilter: CardLibraryFilter;
  onBack: () => void;
  onOpenCard: (cardId: number) => void;
}) {
  const [filter, setFilter] = useState<CardLibraryFilter>(initialFilter);
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);
  const flagged = cards.filter((card) => card.status === "flagged");
  const editedCards = cards.filter((card) => card.status === "edited");
  const editedCount = cards.filter((card) => card.status === "edited").length;
  const baseCards = filter === "flagged"
    ? flagged
    : filter === "edited"
      ? editedCards
      : cards;
  const visibleGroups = groupCardsByDate(baseCards);
  return (
    <div className="page oneScreen detailPage cardLibraryPage">
      <DetailHeader title="卡片库" onBack={onBack} />
      <section className="cardLibrarySummary glassPanel">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          <strong>{cards.length}</strong>
          全部
        </button>
        <button className={filter === "flagged" ? "active" : ""} onClick={() => setFilter("flagged")}>
          <strong>{flagged.length}</strong>
          标记
        </button>
        <button className={filter === "edited" ? "active" : ""} onClick={() => setFilter("edited")}>
          <strong>{editedCount}</strong>
          已改
        </button>
      </section>
      <section className="cardLibraryList glassPanel">
        <div className="cardGroupScroller">
          {visibleGroups.length > 0 ? (
            visibleGroups.map((group) => <CardGroup title={group.title} cards={group.cards} onSelect={onOpenCard} key={group.title} />)
          ) : (
            <div className="emptyInlineState">
              <CircleAlert size={20} />
              <span>当前分类暂无卡片</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function groupCardsByDate(cards: StudyCard[]) {
  const sorted = [...cards].sort((a, b) => b.id - a.id);
  const generated = sorted.filter((card) => card.status === "generated");
  const reviewed = sorted.filter((card) => card.status !== "generated");

  return [
    { title: "新生成待确认", cards: generated },
    { title: "最近入库", cards: reviewed.slice(0, 8) },
    { title: "更早卡片", cards: reviewed.slice(8) }
  ].filter((group) => group.cards.length > 0);
}

function CardGroup({
  title,
  cards,
  onSelect
}: {
  title: string;
  cards: StudyCard[];
  onSelect: (cardId: number) => void;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="cardGroup">
      {cards.map((card) => (
        <button className="libraryCardRow" key={`${title}-${card.id}`} onClick={() => onSelect(card.id)}>
          <i>{card.type}</i>
          <span>
            <b>{card.question}</b>
            <small>{card.knowledgeRef} · {card.source}</small>
          </span>
          {card.status === "flagged" ? <Flag size={15} /> : <ChevronRight size={15} />}
        </button>
      ))}
    </div>
  );
}

function CardEditorView({
  card,
  onBack,
  onQuestionChange,
  onAnswerChange,
  onRewrite
}: {
  card: StudyCard | null;
  onBack: () => void;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onRewrite: (reason?: string) => void;
}) {
  if (!card) {
    return (
      <div className="page oneScreen detailPage cardEditorPage">
        <DetailHeader title="卡片修改" subtitle="未选择卡片" onBack={onBack} />
        <section className="emptyPreview glassPanel">
          <CircleAlert size={24} />
          <strong>没有选中的卡片</strong>
          <span>返回卡片库重新选择。</span>
        </section>
      </div>
    );
  }

  return (
    <div className="page oneScreen detailPage cardEditorPage">
      <DetailHeader title="卡片修改" subtitle={`${card.type} · ${card.knowledgeRef}`} onBack={onBack} />
      <section className="cardEditorPanel glassPanel">
        <div className="editorMetaLine">
          <span>{card.type}</span>
          <span>{card.status === "flagged" ? "已标记" : card.status === "edited" ? "已修改" : "已入库"}</span>
          <span>{card.qualityScore} 分</span>
        </div>
        <label className="editorField">
          <span>题面</span>
          <textarea value={card.question} onChange={(event) => onQuestionChange(event.target.value)} rows={5} />
        </label>
        <label className="editorField">
          <span>答案</span>
          <textarea value={card.answer} onChange={(event) => onAnswerChange(event.target.value)} rows={6} />
        </label>
        <div className="editorEvidence">
          <span>原文依据</span>
          <p>{card.evidence}</p>
        </div>
        <div className="editorSource">
          <Pill size={15} />
          <span>{card.knowledgeRef}</span>
          <small>{card.flaggedReason || `${card.source} · P${card.sourcePage}`}</small>
        </div>
        <button className="rewriteAction" onClick={() => onRewrite(card.flaggedReason || "请基于原文证据优化题面和答案")} type="button">
          <Sparkles size={16} />
          AI 优化这张卡
        </button>
      </section>
    </div>
  );
}

function KnowledgeBaseView({
  materials,
  cards,
  nodes,
  onBack,
  onOpenCard
}: {
  materials: Material[];
  cards: StudyCard[];
  nodes: KnowledgeNode[];
  onBack: () => void;
  onOpenCard: (cardId: number) => void;
}) {
  const [drill, setDrill] = useState<{ type: "topic"; id: number | string } | { type: "source"; id: number } | null>(null);
  const parsedMaterials = materials.filter((material) => material.status === "已解析");
  const sourceMaterials = (parsedMaterials.length > 0 ? parsedMaterials : materials).slice(0, 4);
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const pharmacologyCount = cards.filter((card) => card.tags.includes("药理")).length;
  const regulationCount = cards.filter((card) => card.tags.includes("药事法规") || card.tags.includes("法规")).length;
  const reviewCount = cards.filter((card) => card.tags.includes("处方审核") || card.tags.includes("用药交代")).length;
  const pastedCount = cards.filter((card) => card.tags.includes("粘贴")).length;
  const flaggedCount = cards.filter((card) => card.status === "flagged").length;
  const topicFallbackRows: KnowledgeTopicRow[] = [
    {
      id: "source",
      title: "资料沉淀",
      badge: "来源",
      summary: "先把个人上传资料清洗成可复习的知识点，再归入考试主题。",
      branches: sourceMaterials.map((material) => material.name),
      sourceNames: sourceMaterials.map((material) => material.name).slice(0, 2),
      materialIds: sourceMaterials.map((material) => material.id),
      cardIds: cards.slice(0, 8).map((card) => card.id),
      cardCount: cards.length,
      isRoot: false
    },
    {
      id: "system",
      title: "药学体系",
      badge: "主线",
      summary: "按药考复习逻辑组织，不按文件名堆叠，适合后续持续上传资料。",
      branches: [
        pharmacologyCount ? `药理 ${pharmacologyCount} 张` : "药理待补充",
        regulationCount ? `法规 ${regulationCount} 张` : "法规待补充",
        reviewCount ? `处方审核 ${reviewCount} 张` : "处方审核待补充",
        pastedCount ? `粘贴内容 ${pastedCount} 张` : "粘贴内容待出卡"
      ].slice(0, 4),
      sourceNames: [],
      materialIds: [],
      cardIds: cards.slice(0, 8).map((card) => card.id),
      cardCount: cards.length,
      isRoot: true
    },
    {
      id: "exam",
      title: "考前梳理",
      badge: "输出",
      summary: "把沉淀后的主题转成复习卡、待校正卡和考前总复盘。",
      branches: [`全部卡片 ${cards.length} 张`, `待校正 ${flaggedCount} 张`, "考前总复盘"],
      sourceNames: [],
      materialIds: [],
      cardIds: cards.slice(0, 8).map((card) => card.id),
      cardCount: cards.length,
      isRoot: false
    }
  ];
  const topicRows: KnowledgeTopicRow[] = nodes.length > 0
    ? nodes.map((node) => {
        const linkedMaterials = node.materialIds
          .map((id) => materialById.get(id)?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 3);
        const nodeType = node.nodeType;
        const badge =
          nodeType === "system"
            ? "总库"
            : nodeType === "subject" || nodeType === "chapter"
              ? "主线"
              : "知识点";

        return {
          id: node.id,
          title: node.title,
          badge,
          summary: node.summary,
          branches: node.branches.slice(0, 4),
          sourceNames: linkedMaterials,
          materialIds: node.materialIds,
          cardIds: node.cardIds,
          cardCount: node.cardIds.length,
          isRoot: node.parentId === null || nodeType === "system"
        };
      })
    : topicFallbackRows;
  const topicCount = nodes.length || topicFallbackRows.length;
  const nextMove = flaggedCount > 0
    ? `${flaggedCount} 张卡待校正`
    : parsedMaterials.length > 0
      ? "继续上传同一主题资料会自动合并"
      : "先上传讲义或错题资料建立主干";
  const selectedTopic = drill?.type === "topic" ? topicRows.find((row) => String(row.id) === String(drill.id)) || null : null;
  const selectedSource = drill?.type === "source" ? materialById.get(drill.id) || null : null;
  const rootTopic = topicRows.find((row) => row.isRoot) || topicRows[0] || null;
  const firstCard = cards[0] || null;

  if (selectedTopic) {
    return (
      <div className="page oneScreen detailPage knowledgePage">
        <DetailHeader title="主题详情" onBack={() => setDrill(null)} />
        <KnowledgeTopicDetailView
          topic={selectedTopic}
          materials={materials}
          cards={cards}
          onOpenSource={(materialId) => setDrill({ type: "source", id: materialId })}
          onOpenCard={onOpenCard}
        />
      </div>
    );
  }

  if (selectedSource) {
    return (
      <div className="page oneScreen detailPage knowledgePage">
        <DetailHeader title="资料沉淀" onBack={() => setDrill(null)} />
        <KnowledgeSourceDetailView
          material={selectedSource}
          topics={topicRows}
          cards={cards}
          onOpenTopic={(topicId) => setDrill({ type: "topic", id: topicId })}
          onOpenCard={onOpenCard}
        />
      </div>
    );
  }

  return (
    <div className="page oneScreen detailPage knowledgePage">
      <DetailHeader title="知识架构" onBack={onBack} />
      <section className="knowledgeTree">
        <div className="knowledgeOverview">
          <div>
            <Network size={20} />
            <span>个人药考知识库</span>
          </div>
          <strong>按考试主题沉淀，不按文件堆叠</strong>
          <p>资料抽点，主题归类，最后落到可复习卡片。</p>
          <div className="knowledgeStats">
            <span><b>{parsedMaterials.length}</b>资料</span>
            <span><b>{topicCount}</b>主题</span>
            <span><b>{cards.length}</b>卡片</span>
          </div>
        </div>

        <div className="knowledgeRoute" aria-label="知识沉淀路径">
          <button type="button" onClick={() => sourceMaterials[0] && setDrill({ type: "source", id: sourceMaterials[0].id })} disabled={sourceMaterials.length === 0}>
            <FileText size={17} />
            <strong>资料</strong>
            <span>{parsedMaterials.length} 份已解析</span>
          </button>
          <button type="button" onClick={() => rootTopic && setDrill({ type: "topic", id: rootTopic.id })} disabled={!rootTopic}>
            <Network size={17} />
            <strong>主题树</strong>
            <span>{topicCount} 个节点</span>
          </button>
          <button type="button" onClick={() => firstCard && onOpenCard(firstCard.id)} disabled={!firstCard}>
            <Layers3 size={17} />
            <strong>卡片</strong>
            <span>{cards.length} 张复习</span>
          </button>
        </div>

        <div className="knowledgeSectionTitle">
          <span>考试知识树</span>
          <em>{nextMove}</em>
        </div>

        <div className="knowledgeTopicList">
          {topicRows.map((node) => (
            <button className={`knowledgeTopicCard ${node.isRoot ? "isRoot" : ""}`} key={node.id} onClick={() => setDrill({ type: "topic", id: node.id })} type="button">
              <div className="knowledgeTopicHead">
                <span>{node.badge}</span>
                <strong>{node.title}</strong>
                <em>{node.cardCount} 张卡</em>
              </div>
              <p>{node.summary}</p>
              <div className="knowledgeTopicSources">
                <small>来源</small>
                {node.sourceNames.length > 0 ? (
                  node.sourceNames.map((source) => <span key={`${node.id}-${source}`}>{source}</span>)
                ) : (
                  <span>等待更多资料补全来源</span>
                )}
                <ChevronRight size={15} />
              </div>
            </button>
          ))}
        </div>

        <div className="knowledgeSourcePanel">
          <div className="knowledgeSectionTitle">
            <span>资料沉淀</span>
            <em>保留出处，避免背孤立知识点</em>
          </div>
          {sourceMaterials.length > 0 ? (
            <div className="knowledgeSourceList">
              {sourceMaterials.map((material) => {
                const materialCardCount = material.cardCount ?? cards.filter((card) => card.source === material.name).length;
                return (
                  <button key={material.id} onClick={() => setDrill({ type: "source", id: material.id })} type="button">
                    <i>{material.icon}</i>
                    <span>
                      <strong>{material.name}</strong>
                      <small>{material.status} · {materialCardCount} 张卡 · {getMaterialDayGroup(material)}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="emptyInlineState">
              <CircleAlert size={20} />
              <span>上传资料后，这里会沉淀成个人知识库。</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KnowledgeTopicDetailView({
  topic,
  materials,
  cards,
  onOpenSource,
  onOpenCard
}: {
  topic: KnowledgeTopicRow;
  materials: Material[];
  cards: StudyCard[];
  onOpenSource: (materialId: number) => void;
  onOpenCard: (cardId: number) => void;
}) {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const topicMaterials = topic.materialIds
    .map((materialId) => materialById.get(materialId))
    .filter((material): material is Material => Boolean(material));
  const topicCards = topic.cardIds.length > 0
    ? cards.filter((card) => topic.cardIds.includes(card.id))
    : cards.filter((card) => topic.sourceNames.includes(card.source)).slice(0, 6);

  return (
    <section className="knowledgeTree knowledgeDetail">
      <div className="knowledgeDetailHero">
        <span>{topic.badge}</span>
        <strong>{topic.title}</strong>
        <p>{topic.summary}</p>
      </div>

      <div className="knowledgeDetailSection">
        <div className="knowledgeSectionTitle">
          <span>分支</span>
          <em>{topic.branches.length} 个知识方向</em>
        </div>
        <div className="knowledgeBranchList">
          {topic.branches.length > 0 ? (
            topic.branches.map((branch, index) => <span key={`${topic.id}-${branch}-${index}`}>{branch}</span>)
          ) : (
            <span>等待 AI 继续拆分</span>
          )}
        </div>
      </div>

      <div className="knowledgeDetailSection">
        <div className="knowledgeSectionTitle">
          <span>来源资料</span>
          <em>点开看这份资料沉淀</em>
        </div>
        {topicMaterials.length > 0 ? (
          <div className="knowledgeMiniRows">
            {topicMaterials.map((material) => (
              <button key={material.id} onClick={() => onOpenSource(material.id)} type="button">
                <i>{material.icon}</i>
                <span>
                  <strong>{material.name}</strong>
                  <small>{material.status} · {getMaterialDayGroup(material)}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <div className="emptyInlineState">
            <CircleAlert size={20} />
            <span>这个主题还没有明确来源。</span>
          </div>
        )}
      </div>

      <KnowledgeCardLinks cards={topicCards} onOpenCard={onOpenCard} title="关联卡片" />
    </section>
  );
}

function KnowledgeSourceDetailView({
  material,
  topics,
  cards,
  onOpenTopic,
  onOpenCard
}: {
  material: Material;
  topics: KnowledgeTopicRow[];
  cards: StudyCard[];
  onOpenTopic: (topicId: number | string) => void;
  onOpenCard: (cardId: number) => void;
}) {
  const sourceCards = cards.filter((card) => card.source === material.name);
  const linkedTopics = topics.filter((topic) => topic.materialIds.includes(material.id));
  const sourceUrl = material.fileUrl || getMaterialSourceHref(material);

  return (
    <section className="knowledgeTree knowledgeDetail">
      <div className="knowledgeDetailHero source">
        <span>{material.status}</span>
        <strong>{material.name}</strong>
        <p>{material.meta} · {getMaterialDayGroup(material)}</p>
        <a className="knowledgePrimaryLink" href={sourceUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          打开原文件
        </a>
      </div>

      <div className="knowledgeDetailSection">
        <div className="knowledgeSectionTitle">
          <span>沉淀主题</span>
          <em>{linkedTopics.length || 0} 个关联节点</em>
        </div>
        {linkedTopics.length > 0 ? (
          <div className="knowledgeMiniRows">
            {linkedTopics.map((topic) => (
              <button key={topic.id} onClick={() => onOpenTopic(topic.id)} type="button">
                <i><Network size={16} /></i>
                <span>
                  <strong>{topic.title}</strong>
                  <small>{topic.badge} · {topic.cardCount} 张卡</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <div className="emptyInlineState">
            <CircleAlert size={20} />
            <span>这份资料暂时还没有归入主题树。</span>
          </div>
        )}
      </div>

      <KnowledgeCardLinks cards={sourceCards} onOpenCard={onOpenCard} title="生成卡片" />
    </section>
  );
}

function KnowledgeCardLinks({ cards, title, onOpenCard }: { cards: StudyCard[]; title: string; onOpenCard: (cardId: number) => void }) {
  return (
    <div className="knowledgeDetailSection">
      <div className="knowledgeSectionTitle">
        <span>{title}</span>
        <em>{cards.length} 张可继续修改</em>
      </div>
      {cards.length > 0 ? (
        <div className="knowledgeCardLinks">
          {cards.slice(0, 8).map((card) => (
            <button key={card.id} onClick={() => onOpenCard(card.id)} type="button">
              <i>{card.type}</i>
              <span>
                <strong>{card.question}</strong>
                <small>{card.knowledgeRef} · {card.source}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <div className="emptyInlineState">
          <CircleAlert size={20} />
          <span>还没有关联卡片。</span>
        </div>
      )}
    </div>
  );
}

function DetailHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <section className="detailHeader glassPanel">
      <button onClick={onBack} aria-label="返回上一页">
        <ArrowLeft size={18} />
      </button>
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </section>
  );
}

function ProfileView() {
  const [panel, setPanel] = useState<ProfilePanel | null>(null);
  const [displayName, setDisplayName] = useState("药考学员");
  const [examRole, setExamRole] = useState("执业药师");
  const [dailyQuota, setDailyQuota] = useState(18);
  const [intervalMode, setIntervalMode] = useState<ReviewDifficulty>("normal");
  const [weakFirst, setWeakFirst] = useState(true);
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState("21:30");
  const [examReminder, setExamReminder] = useState(true);
  const [localOnly, setLocalOnly] = useState(true);
  const [exportFormat, setExportFormat] = useState("Excel");
  const [syncCheckedAt, setSyncCheckedAt] = useState("刚刚");
  const totalStudyMinutes = 42;
  const studyWeek = [
    { day: "一", minutes: 4 },
    { day: "二", minutes: 7 },
    { day: "三", minutes: 5 },
    { day: "四", minutes: 9 },
    { day: "五", minutes: 6 },
    { day: "六", minutes: 8 },
    { day: "今", minutes: 3 }
  ];
  const settings = [
    {
      icon: <UserRound size={18} />,
      title: "账号设置",
      desc: "昵称、头像、备考身份",
      panel: "account" as const
    },
    {
      icon: <SlidersHorizontal size={18} />,
      title: "复习偏好",
      desc: "间隔节奏、难度权重",
      panel: "review" as const
    },
    {
      icon: <Bell size={18} />,
      title: "提醒设置",
      desc: "待复习提醒、考试节点",
      panel: "reminder" as const
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "隐私与导出",
      desc: "本地资料、卡片数据",
      panel: "privacy" as const
    }
  ];

  if (panel) {
    const panelTitle = panel === "streak"
      ? "连续复习"
      : panel === "learning"
        ? "累计学习"
        : panel === "sync"
          ? "数据同步"
          : panel === "account"
      ? "账号设置"
      : panel === "review"
        ? "复习偏好"
        : panel === "reminder"
          ? "提醒设置"
          : panel === "privacy"
            ? "隐私与导出"
            : "关于产品";

    return (
      <div className="page oneScreen detailPage profileDetailPage">
        <DetailHeader title={panelTitle} onBack={() => setPanel(null)} />
        <section className="profileDetailPanel">
          {panel === "streak" && (
            <>
              <div className="profileMetricHero streak glassPanel">
                <span className="profileMetricIcon"><Flame size={25} /></span>
                <div>
                  <small>正在保持</small>
                  <strong><b>5</b> 天</strong>
                  <p>你已经连续 5 天完成复习，今天也算在内。</p>
                </div>
              </div>
              <div className="streakCalendar glassPanel">
                <div className="profilePanelHeading">
                  <span>最近 7 天</span>
                  <em>5 天达标</em>
                </div>
                <div className="streakDays" aria-label="最近七天复习记录">
                  {["一", "二", "三", "四", "五", "六", "今"].map((day, index) => (
                    <div className={`${index >= 2 ? "active" : ""} ${day === "今" ? "today" : ""}`} key={day}>
                      <span>{index >= 2 ? <Check size={14} /> : index + 7}</span>
                      <small>{day}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="profileMetricGrid">
                <div className="glassPanel">
                  <Trophy size={18} />
                  <strong>8 天</strong>
                  <small>最长连续</small>
                </div>
                <div className="glassPanel">
                  <CalendarDays size={18} />
                  <strong>12 天</strong>
                  <small>累计活跃</small>
                </div>
              </div>
              <div className="profileEncouragement glassPanel">
                <Sparkles size={17} />
                <span>
                  <strong>再坚持 3 天，刷新最长纪录</strong>
                  <small>每天完成当天推荐卡即可延续。</small>
                </span>
              </div>
            </>
          )}

          {panel === "learning" && (
            <>
              <div className="profileMetricHero learning glassPanel">
                <span className="profileMetricIcon"><Timer size={25} /></span>
                <div>
                  <small>累计专注学习</small>
                  <strong><b>{totalStudyMinutes}</b> 分钟</strong>
                  <p>这些零散时间，已经完成了 3 轮高质量药考复习。</p>
                </div>
              </div>
              <div className="studyTimeChart glassPanel">
                <div className="profilePanelHeading">
                  <span>本周学习时长</span>
                  <em>累计 42 分钟</em>
                </div>
                <div className="studyBars" aria-label="最近七天学习分钟数">
                  {studyWeek.map((item) => (
                    <div key={item.day}>
                      <strong>{item.minutes}</strong>
                      <i style={{ height: `${Math.max(18, item.minutes * 8)}%` }} />
                      <small>{item.day}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="studyMilestone glassPanel">
                <div>
                  <span><Trophy size={17} /> 学习里程</span>
                  <strong>距离 60 分钟里程碑还差 18 分钟</strong>
                </div>
                <div className="milestoneTrack" aria-label="42/60 分钟">
                  <i style={{ width: `${(totalStudyMinutes / 60) * 100}%` }} />
                </div>
                <small>每一分钟都已经沉淀进复习记录，而不是一次性刷过。</small>
              </div>
              <div className="profileMetricGrid three">
                <div className="glassPanel"><strong>11</strong><small>复习卡片</small></div>
                <div className="glassPanel"><strong>3</strong><small>攻克薄弱点</small></div>
                <div className="glassPanel"><strong>5</strong><small>专注天数</small></div>
              </div>
            </>
          )}

          {panel === "sync" && (
            <>
              <div className="profileMetricHero sync glassPanel">
                <span className="profileMetricIcon"><HardDrive size={25} /></span>
                <div>
                  <small>当前保存方式</small>
                  <strong>本地数据</strong>
                  <p>资料和学习记录保存在这台设备，最后校验：{syncCheckedAt}。</p>
                </div>
              </div>
              <div className="syncInventory glassPanel">
                <div className="profilePanelHeading">
                  <span>本地数据清单</span>
                  <em>状态正常</em>
                </div>
                <div><FileText size={17} /><span><strong>8 份资料</strong><small>源文件与解析结果</small></span><Check size={16} /></div>
                <div><Layers3 size={17} /><span><strong>11 张卡片</strong><small>修改、收藏与标记状态</small></span><Check size={16} /></div>
                <div><Brain size={17} /><span><strong>学习记录</strong><small>复习结果与下次排期</small></span><Check size={16} /></div>
              </div>
              <button className="syncCheckButton" onClick={() => setSyncCheckedAt("刚刚完成")} type="button">
                <ShieldCheck size={18} />
                校验本地数据
              </button>
              <div className="profileEncouragement glassPanel">
                <ShieldCheck size={17} />
                <span>
                  <strong>本地优先，默认不上传原文件</strong>
                  <small>云同步将在账号体系接入后单独授权。</small>
                </span>
              </div>
            </>
          )}

          {panel === "account" && (
            <>
              <div className="profileIdentityCard glassPanel">
                <div className="profileAvatar">
                  <UserRound size={26} />
                </div>
                <span>
                  <strong>{displayName}</strong>
                  <small>{examRole}备考者 · 本地数据</small>
                </span>
              </div>
              <label className="profileField glassPanel">
                <span>昵称</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
              <div className="profileSettingBlock glassPanel">
                <strong>备考身份</strong>
                <div className="profileChoiceGrid">
                  {["执业药师", "药学职称", "医学考研"].map((role) => (
                    <button className={examRole === role ? "active" : ""} key={role} onClick={() => setExamRole(role)} type="button">
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <button className="profileActionRow glassPanel" type="button">
                <ShieldCheck size={17} />
                <span>
                  <strong>账号安全</strong>
                  <small>本机 Demo，后续接入手机号和云同步</small>
                </span>
                <ChevronRight size={15} />
              </button>
            </>
          )}

          {panel === "review" && (
            <>
              <div className="profileSettingBlock glassPanel">
                <strong>每日复习量</strong>
                <div className="quotaStepper">
                  <button onClick={() => setDailyQuota((value) => Math.max(8, value - 2))} type="button">-</button>
                  <span>{dailyQuota} 张/天</span>
                  <button onClick={() => setDailyQuota((value) => Math.min(40, value + 2))} type="button">+</button>
                </div>
              </div>
              <div className="profileSettingBlock glassPanel">
                <strong>间隔策略</strong>
                <div className="profileChoiceGrid">
                  {(Object.keys(reviewProfiles) as ReviewDifficulty[]).map((mode) => (
                    <button className={intervalMode === mode ? "active" : ""} key={mode} onClick={() => setIntervalMode(mode)} type="button">
                      {reviewProfiles[mode].label}
                    </button>
                  ))}
                </div>
                <small>{reviewProfiles[intervalMode].summary}</small>
              </div>
              <button className={`profileToggleRow glassPanel ${weakFirst ? "active" : ""}`} onClick={() => setWeakFirst((value) => !value)} type="button">
                <Flag size={17} />
                <span>
                  <strong>薄弱卡优先</strong>
                  <small>{weakFirst ? "忘记、模糊卡会排在前面" : "按到期时间顺序复习"}</small>
                </span>
                <i>{weakFirst ? "开" : "关"}</i>
              </button>
            </>
          )}

          {panel === "reminder" && (
            <>
              <button className={`profileToggleRow glassPanel ${reminderOn ? "active" : ""}`} onClick={() => setReminderOn((value) => !value)} type="button">
                <Bell size={17} />
                <span>
                  <strong>每日提醒</strong>
                  <small>{reminderOn ? `${reminderTime} 提醒今日复习` : "已关闭提醒"}</small>
                </span>
                <i>{reminderOn ? "开" : "关"}</i>
              </button>
              <div className="profileSettingBlock glassPanel">
                <strong>提醒时间</strong>
                <div className="profileChoiceGrid">
                  {["08:00", "12:30", "21:30"].map((time) => (
                    <button className={reminderTime === time ? "active" : ""} key={time} onClick={() => setReminderTime(time)} type="button">
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <button className={`profileToggleRow glassPanel ${examReminder ? "active" : ""}`} onClick={() => setExamReminder((value) => !value)} type="button">
                <CalendarDays size={17} />
                <span>
                  <strong>考试节点提醒</strong>
                  <small>考前 30 / 14 / 7 天自动收紧复习</small>
                </span>
                <i>{examReminder ? "开" : "关"}</i>
              </button>
            </>
          )}

          {panel === "privacy" && (
            <>
              <button className={`profileToggleRow glassPanel ${localOnly ? "active" : ""}`} onClick={() => setLocalOnly((value) => !value)} type="button">
                <ShieldCheck size={17} />
                <span>
                  <strong>资料本地优先</strong>
                  <small>{localOnly ? "上传原文件优先保留在本地" : "允许后续云端同步"}</small>
                </span>
                <i>{localOnly ? "开" : "关"}</i>
              </button>
              <div className="profileSettingBlock glassPanel">
                <strong>导出格式</strong>
                <div className="profileChoiceGrid">
                  {["Excel", "Markdown", "Anki"].map((format) => (
                    <button className={exportFormat === format ? "active" : ""} key={format} onClick={() => setExportFormat(format)} type="button">
                      {format}
                    </button>
                  ))}
                </div>
              </div>
              <button className="profileActionRow glassPanel" type="button">
                <Upload size={17} />
                <span>
                  <strong>导出卡片和资料索引</strong>
                  <small>当前选择：{exportFormat}</small>
                </span>
                <ChevronRight size={15} />
              </button>
              <button className="profileActionRow danger glassPanel" type="button">
                <RotateCcw size={17} />
                <span>
                  <strong>清理本地缓存</strong>
                  <small>仅清理临时解析结果，不删除原文件</small>
                </span>
                <ChevronRight size={15} />
              </button>
            </>
          )}

          {panel === "about" && (
            <>
              <div className="profileIdentityCard glassPanel">
                <span className="profileAvatar">
                  <Pill size={26} />
                </span>
                <span>
                  <strong>药考速记</strong>
                  <small>AI 资料出卡 · 个人药学知识库</small>
                </span>
              </div>
              <div className="profileSettingBlock glassPanel">
                <strong>版本信息</strong>
                <p>Demo 0.2 · 医学药考方向</p>
                <small>当前重点：上传资料、自动出卡、知识沉淀、复习排期。</small>
              </div>
              <button className="profileActionRow glassPanel" type="button">
                <ExternalLink size={17} />
                <span>
                  <strong>产品反馈</strong>
                  <small>记录你觉得不顺的页面和流程</small>
                </span>
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page oneScreen profilePage">
      <section className="profileHero glassPanel">
        <div className="profileAvatar">
          <UserRound size={28} />
        </div>
        <div>
          <span>执业药师备考者</span>
          <strong>{displayName}</strong>
          <small>{dailyQuota} 张/天 · {weakFirst ? "薄弱优先" : "顺序复习"}</small>
        </div>
      </section>
      <section className="profileStats glassPanel">
        <button onClick={() => setPanel("streak")} aria-label="查看连续复习详情" type="button">
          <strong>5</strong>
          <span>连续复习</span>
          <ChevronRight size={12} />
        </button>
        <button onClick={() => setPanel("learning")} aria-label="查看累计学习详情" type="button">
          <strong>42 分钟</strong>
          <span>累计学习</span>
          <ChevronRight size={12} />
        </button>
        <button onClick={() => setPanel("sync")} aria-label="查看数据同步详情" type="button">
          <strong>本地</strong>
          <span>数据同步</span>
          <ChevronRight size={12} />
        </button>
      </section>
      <section className="settingsPanel glassPanel" aria-label="我的设置">
        {settings.map((item) => (
          <button className="settingRow" key={item.title} onClick={() => setPanel(item.panel)} type="button">
            <span className="settingIcon">{item.icon}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.desc}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
        <button className="settingRow" onClick={() => setPanel("about")} type="button">
          <span className="settingIcon"><Pill size={18} /></span>
          <span>
            <strong>关于产品</strong>
            <small>药考速记 Demo 版本</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}

function BottomSheet({
  sheet,
  card,
  onClose,
  onQuestionChange,
  onAnswerChange,
  onFeedback,
  onRewrite
}: {
  sheet: Exclude<SheetState, null>;
  card: StudyCard;
  onClose: () => void;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onFeedback: (reason: string) => void;
  onRewrite: (reason: string) => void;
}) {
  const feedbackReasons = ["答案不准", "问法不好", "太宽泛", "依据不对"];

  return (
    <div className="sheetBackdrop">
      <section className="bottomSheet">
        <div className="sheetHandle" />
        <div className="sheetTitle">
          <strong>{sheet.type === "edit" ? "编辑速记卡" : "反馈不对"}</strong>
          <button onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        {sheet.type === "edit" ? (
          <div className="sheetForm">
            <label>
              问题
              <textarea value={card.question} onChange={(event) => onQuestionChange(event.target.value)} rows={3} />
            </label>
            <label>
              答案
              <textarea value={card.answer} onChange={(event) => onAnswerChange(event.target.value)} rows={4} />
            </label>
            <button className="primaryAction" onClick={onClose}>
              <Check size={18} />
              保存
            </button>
          </div>
        ) : (
          <div className="feedbackGrid">
            <p>选择原因后会标记到卡片库，后续可在卡片详情里修改。</p>
            {feedbackReasons.map((reason) => (
              <button onClick={() => onFeedback(reason)} key={reason}>{reason}</button>
            ))}
            <button
              className="rewriteNow"
              onClick={() => {
                onRewrite(card.flaggedReason || "用户反馈这张卡不够准确，请基于原文证据重写");
                onClose();
              }}
            >
              <Sparkles size={16} />
              直接 AI 优化
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function BottomNav({
  view,
  generatedCount,
  onNavigate
}: {
  view: View;
  generatedCount: number;
  onNavigate: (view: View) => void;
}) {
  const materialsActive = view === "project" || view === "upload" || view === "cards" || view === "materialList" || view === "cardLibrary" || view === "cardEditor" || view === "knowledgeBase";

  return (
    <nav className="bottomNav" aria-label="一级导航">
      <TabButton active={view === "review"} icon={<BookOpenCheck size={19} />} label="复习" onClick={() => onNavigate("review")} />
      <TabButton
        active={materialsActive}
        icon={<Library size={19} />}
        label="资料"
        badge={generatedCount}
        onClick={() => onNavigate("project")}
      />
      <TabButton active={view === "progress"} icon={<Brain size={19} />} label="进度" onClick={() => onNavigate("progress")} />
      <TabButton active={view === "profile"} icon={<UserRound size={19} />} label="我的" onClick={() => onNavigate("profile")} />
    </nav>
  );
}

function TabButton({
  active,
  icon,
  label,
  badge,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {!!badge && <i>{badge}</i>}
    </button>
  );
}
