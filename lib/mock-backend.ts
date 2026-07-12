export type CardStatus = "generated" | "active" | "edited" | "flagged" | "deleted";
export type ReviewResult = "remembered" | "fuzzy" | "forgotten" | "wrong";
export type CardType = "问答" | "填空" | "判断";
export type MaterialStatus = "已解析" | "待接入";
export type MaterialFileType = "pdf" | "word" | "ppt" | "text" | "audio" | "video" | "image" | "other";

export type StudyCard = {
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

export type StudyMaterial = {
  id: number;
  name: string;
  meta: string;
  status: MaterialStatus;
  fileType: MaterialFileType;
  sourceType: "upload" | "paste";
  uploadedAt: string;
  parsedAt?: string;
  cardCount: number;
  fileUrl?: string;
  rawText?: string;
};

export type KnowledgeNode = {
  id: number;
  parentId: number | null;
  title: string;
  nodeType: "system" | "subject" | "chapter" | "concept";
  summary: string;
  branches: string[];
  materialIds: number[];
  cardIds: number[];
};

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

const seedMaterials: StudyMaterial[] = [
  {
    id: 1,
    name: "药理学高频药物讲义.pdf",
    meta: "88 页 · 18 张卡",
    status: "已解析",
    fileType: "pdf",
    sourceType: "upload",
    uploadedAt: "2026-07-08T09:12:00+08:00",
    parsedAt: "2026-07-08T09:16:00+08:00",
    cardCount: 18
  },
  {
    id: 2,
    name: "抗菌药物专题.docx",
    meta: "24 页 · 11 张卡",
    status: "已解析",
    fileType: "word",
    sourceType: "upload",
    uploadedAt: "2026-07-07T18:40:00+08:00",
    parsedAt: "2026-07-07T18:43:00+08:00",
    cardCount: 11
  },
  {
    id: 3,
    name: "执业药师冲刺课录音.m4a",
    meta: "V1 接入转写",
    status: "待接入",
    fileType: "audio",
    sourceType: "upload",
    uploadedAt: "2026-07-08T08:32:00+08:00",
    cardCount: 0
  },
  {
    id: 4,
    name: "降糖药专题讲义.pdf",
    meta: "64 页 · 16 张卡",
    status: "已解析",
    fileType: "pdf",
    sourceType: "upload",
    uploadedAt: "2026-07-08T11:40:00+08:00",
    parsedAt: "2026-07-08T11:46:00+08:00",
    cardCount: 16
  },
  {
    id: 5,
    name: "药事管理与法规笔记.md",
    meta: "12 页 · 9 张卡",
    status: "已解析",
    fileType: "text",
    sourceType: "paste",
    uploadedAt: "2026-07-08T14:25:00+08:00",
    parsedAt: "2026-07-08T14:26:00+08:00",
    cardCount: 9
  },
  {
    id: 6,
    name: "处方审核训练.pptx",
    meta: "32 页 · 7 张卡",
    status: "已解析",
    fileType: "ppt",
    sourceType: "upload",
    uploadedAt: "2026-07-07T20:18:00+08:00",
    parsedAt: "2026-07-07T20:21:00+08:00",
    cardCount: 7
  },
  {
    id: 7,
    name: "考前串讲视频.mp4",
    meta: "等待视频解析",
    status: "待接入",
    fileType: "video",
    sourceType: "upload",
    uploadedAt: "2026-07-08T15:08:00+08:00",
    cardCount: 0
  },
  {
    id: 8,
    name: "处方审核错题整理.docx",
    meta: "18 页 · 6 张卡",
    status: "已解析",
    fileType: "word",
    sourceType: "upload",
    uploadedAt: "2026-07-06T21:04:00+08:00",
    parsedAt: "2026-07-06T21:08:00+08:00",
    cardCount: 6
  }
];

const seedKnowledgeNodes: KnowledgeNode[] = [
  {
    id: 1,
    parentId: null,
    title: "执业药师药学知识库",
    nodeType: "system",
    summary: "由药理学、药事法规、处方审核资料沉淀形成。",
    branches: ["药理学主干", "药事法规", "处方审核"],
    materialIds: [1, 2, 4, 5, 8],
    cardIds: [1, 2, 3, 4, 101, 102, 103, 105, 107]
  },
  {
    id: 2,
    parentId: 1,
    title: "药理学主干",
    nodeType: "chapter",
    summary: "围绕药物机制、适应证、禁忌证、不良反应构建主干。",
    branches: ["心血管系统药", "抗菌药物", "内分泌药物"],
    materialIds: [1, 2, 4, 8],
    cardIds: [1, 2, 3, 4, 101, 103, 105, 107]
  },
  {
    id: 3,
    parentId: 1,
    title: "药事法规与处方审核",
    nodeType: "chapter",
    summary: "当前主要沉淀处方管理、特殊人群用药和用药交代。",
    branches: ["处方管理", "特殊人群", "用药安全"],
    materialIds: [5],
    cardIds: [102, 104, 106]
  }
];

let cards = [...activeSeedCards, ...generatedSeedCards];
let materials = [...seedMaterials];
let knowledgeNodes = [...seedKnowledgeNodes];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getNextReviewDays(result: ReviewResult, streak: number) {
  if (result === "forgotten") return 1;
  if (result === "fuzzy") return 2;
  if (result === "wrong") return 0;
  return streak >= 1 ? 7 : 4;
}

export function getCards(status?: CardStatus) {
  const list = status ? cards.filter((card) => card.status === status) : cards.filter((card) => card.status !== "deleted");
  return clone(list);
}

export function getMaterials() {
  return clone(materials);
}

export function getMaterial(id: number) {
  const material = materials.find((item) => item.id === id);
  return material ? clone(material) : null;
}

export function getTodayReview() {
  return clone(cards.filter((card) => ["active", "edited", "flagged"].includes(card.status) && card.nextReviewInDays === 0));
}

export function approveAllGeneratedCards() {
  cards = cards.map((card) =>
    card.status === "generated"
      ? {
          ...card,
          status: "active",
          nextReviewInDays: 0
        }
      : card
  );
  return getCards();
}

export function updateCard(cardId: number, patch: Partial<StudyCard>) {
  let updated: StudyCard | null = null;
  cards = cards.map((card) => {
    if (card.id !== cardId) return card;
    updated = {
      ...card,
      ...patch,
      status: patch.status ?? (card.status === "generated" ? "generated" : "edited")
    };
    return updated;
  });
  return updated ? clone(updated) : null;
}

export function toggleCardFlag(cardId: number) {
  let updated: StudyCard | null = null;
  cards = cards.map((card) => {
    if (card.id !== cardId) return card;
    updated = {
      ...card,
      status: card.status === "flagged" ? "active" : "flagged"
    };
    return updated;
  });
  return updated ? clone(updated) : null;
}

export function submitReviewResult(cardId: number, result: ReviewResult) {
  let updated: StudyCard | null = null;
  cards = cards.map((card) => {
    if (card.id !== cardId) return card;
    updated = {
      ...card,
      status: result === "wrong" ? "flagged" : card.status,
      lastResult: result,
      nextReviewInDays: getNextReviewDays(result, card.streak),
      streak: result === "remembered" ? card.streak + 1 : 0
    };
    return updated;
  });

  const shouldProbe = result === "fuzzy" || result === "forgotten";
  return {
    card: updated ? clone(updated) : null,
    shouldProbe,
    nextCards: getTodayReview()
  };
}

export function createPastedMaterial(content: string) {
  const id = Math.max(...materials.map((item) => item.id)) + 1;
  const trimmed = content.trim();
  const material: StudyMaterial = {
    id,
    name: trimmed ? `粘贴资料 ${id}` : `课程资料 ${id}`,
    meta: `${Math.max(trimmed.length, 280)} 字 · 待拆解`,
    status: "待接入",
    fileType: "text",
    sourceType: "paste",
    uploadedAt: new Date().toISOString(),
    cardCount: 0,
    rawText: trimmed || "本地模拟：这里会保存用户粘贴的课程内容。"
  };
  materials = [material, ...materials];
  return clone(material);
}

export function createUploadedMaterial(fileName?: string) {
  const id = Math.max(...materials.map((item) => item.id)) + 1;
  const name = fileName?.trim() || `上传资料 ${id}.pdf`;
  const fileType: MaterialFileType = name.endsWith(".doc") || name.endsWith(".docx") ? "word" : name.endsWith(".txt") ? "text" : "pdf";
  const material: StudyMaterial = {
    id,
    name,
    meta: "本地模拟 · 待拆解",
    status: "待接入",
    fileType,
    sourceType: "upload",
    uploadedAt: new Date().toISOString(),
    cardCount: 0
  };
  materials = [material, ...materials];
  return clone(material);
}

export function parseMaterial(materialId: number) {
  const material = materials.find((item) => item.id === materialId);

  if (!material) return null;

  material.status = "已解析";
  material.meta = material.sourceType === "paste" ? `${Math.max(material.rawText?.length ?? 0, 280)} 字 · 已拆解` : "本地模拟 · 已拆解";
  material.parsedAt = new Date().toISOString();
  material.cardCount = Math.max(material.cardCount, 2);

  return clone(material);
}

export function generateCardsForMaterial(materialId: number) {
  const material = materials.find((item) => item.id === materialId);
  const baseId = Math.max(...cards.map((card) => card.id)) + 1;
  const source = material?.name ?? "新上传资料";
  const newCards: StudyCard[] = [
    {
      id: baseId,
      type: "问答",
      question: "AI 如何把这份药学资料拆成适合速记的知识点？",
      answer: "先提取药物机制、适应证、禁忌证、不良反应和相互作用，再压缩成一张卡只考一个点的速记卡。",
      source,
      sourcePage: 1,
      evidence: "本地模拟：后续由资料解析和大模型生成。",
      knowledgeRef: "药学知识点",
      tags: ["AI出卡", "药学资料"],
      status: "generated",
      qualityScore: 89,
      nextReviewInDays: 0,
      streak: 0
    },
    {
      id: baseId + 1,
      type: "填空",
      question: "高质量速记卡应尽量做到一张卡只考____个核心点。",
      answer: "一个。这样更适合快速复习，也便于 AI 根据遗忘情况调整排期。",
      source,
      sourcePage: 1,
      evidence: "本地模拟：后续由卡片质检模块判断。",
      knowledgeRef: "药考出卡规则",
      tags: ["AI出卡", "质检"],
      status: "generated",
      qualityScore: 91,
      nextReviewInDays: 0,
      streak: 0
    }
  ];
  cards = [...newCards, ...cards];
  return clone(newCards);
}

export function getProgressOverview() {
  const activeCards = cards.filter((card) => ["active", "edited", "flagged"].includes(card.status));
  const dueCards = activeCards.filter((card) => card.nextReviewInDays === 0);
  const flaggedCards = activeCards.filter((card) => card.status === "flagged");

  return {
    dueCount: dueCards.length,
    flaggedCount: flaggedCards.length,
    cardCount: activeCards.length,
    materialCount: materials.length,
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

export function getKnowledgeGraph() {
  return clone(knowledgeNodes);
}

export function getKnowledgeNode(id: number) {
  const node = knowledgeNodes.find((item) => item.id === id);
  return node ? clone(node) : null;
}

export function createAIProbe(cardId: number, triggerResult: ReviewResult) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) return null;

  return {
    id: Date.now(),
    cardId,
    triggerResult,
    diagnosis:
      triggerResult === "forgotten"
        ? "这张卡可能不是单纯没背，而是药物机制、禁忌或不良反应之间的边界没有区分清楚。"
        : "这张卡已经有印象，但关键用药点还不够稳定。",
    suggestionType: card.tags.includes("相互作用") ? "compare_card" : "cloze_card",
    suggestedQuestion: card.tags.includes("相互作用")
      ? "这组相互作用最容易和哪类用药禁忌混淆？"
      : `${card.knowledgeRef} 中最容易漏掉的药考关键词是什么？`,
    suggestedAnswer: card.tags.includes("相互作用")
      ? "先判断是否属于配伍禁忌、药效增强或药效降低，再记住对应风险和处理方式。"
      : "优先记忆机制、适应证、禁忌证、不良反应、相互作用和特殊人群提示。",
    status: "suggested",
    createdAt: new Date().toISOString()
  };
}
