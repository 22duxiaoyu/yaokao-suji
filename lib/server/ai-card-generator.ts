import { canRunDemoAI, recordAIRun } from "@/lib/server/ai-usage";

type CardType = "qa" | "cloze" | "compare" | "case_rule" | "drug_memory";
type Difficulty = "easy" | "normal" | "hard";

export type AISourceRef = {
  sourceTitle: string;
  locator?: string;
  quote?: string;
};

export type AIGeneratedCard = {
  question: string;
  answer: string;
  explanation: string;
  cardType: CardType;
  difficulty: Difficulty;
  qualityScore: number;
  sourceRefs: AISourceRef[];
  tags: string[];
};

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type RawCard = {
  question?: unknown;
  answer?: unknown;
  explanation?: unknown;
  cardType?: unknown;
  difficulty?: unknown;
  qualityScore?: unknown;
  sourceRefs?: unknown;
  tags?: unknown;
};

const CARD_TYPES = new Set<CardType>(["qa", "cloze", "compare", "case_rule", "drug_memory"]);
const DIFFICULTIES = new Set<Difficulty>(["easy", "normal", "hard"]);

function getAIConfig() {
  const provider = process.env.AI_PROVIDER || "deepseek";
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || "deepseek-v4-flash";
  const baseURL = (process.env.AI_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/$/, "");

  return {
    provider,
    apiKey,
    model,
    baseURL
  };
}

export function isAICardGenerationConfigured() {
  const config = getAIConfig();
  return config.provider === "deepseek" && Boolean(config.apiKey);
}

function getSystemPrompt() {
  return `你是一个面向中国执业药师考试和药学复习的 AI 速记卡片生成器。

你的目标不是做泛泛总结，而是把用户资料拆成适合碎片化复习的高质量闪卡。

规则：
1. 一张卡只考一个知识点，避免把多个问题塞进同一张卡。
2. 优先生成药考有用的卡：药物作用机制、适应证、禁忌证、不良反应、药物相互作用、特殊人群用药、用药监护、药事法规、易混药物对比。
3. 不要编造资料里没有出现的指南、规范或出处编号；没有明确依据时 sourceRefs 用 [{"sourceTitle":"药学知识点"}]。
4. 问题要短、明确、适合手机上快速复习。
5. 答案要准确、可背诵，不要写成大段论文。
6. 填空题用 “____” 表示空位。
7. 必须输出合法 json，不要输出 markdown。
8. json 中所有 key 和所有字符串 value 都必须使用英文双引号，不能出现未加引号的中文文本。
9. 不要输出注释、解释、前后缀文本，只输出一个 json object。

json 输出格式示例：
{
  "cards": [
    {
      "question": "阿司匹林最需要警惕的典型不良反应是什么？",
      "answer": "胃肠道刺激和出血风险，尤其是消化性溃疡、合并抗凝药或高龄患者更要警惕。",
      "explanation": "这类题适合把典型不良反应和高危人群绑定记忆。",
      "cardType": "qa",
      "difficulty": "normal",
      "qualityScore": 92,
      "sourceRefs": [{"sourceTitle": "药学知识点"}],
      "tags": ["AI出卡", "资料", "药理"]
    }
  ]
}`;
}

function buildUserPrompt({
  materialTitle,
  chunks,
  requestedCount
}: {
  materialTitle: string;
  chunks: string[];
  requestedCount: number;
}) {
  const clippedChunks = chunks.map((chunk, index) => {
    const content = chunk.length > 900 ? `${chunk.slice(0, 900)}...` : chunk;
    return `【片段 ${index + 1}】\n${content}`;
  });

  return `请基于以下课程资料生成 ${requestedCount} 张高质量药考速记卡。

资料标题：${materialTitle}

请输出 json 对象，字段只有 cards。
cards 数量尽量等于 ${requestedCount}。
cardType 只能是 qa、cloze、compare、case_rule、drug_memory。
difficulty 只能是 easy、normal、hard。
qualityScore 为 0-100 的整数。

资料内容：
${clippedChunks.join("\n\n")}`;
}

function stripCodeFence(content: string) {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJSONContent(content: string) {
  const stripped = stripCodeFence(content);

  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1)) as unknown;
    }

    throw new Error("AI response is not valid JSON.");
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeSourceRefs(value: unknown): AIGeneratedCard["sourceRefs"] {
  const rawRefs = Array.isArray(value) ? value : [];

  if (rawRefs.length === 0) return [{ sourceTitle: "药学知识点" }];

  const refs: AIGeneratedCard["sourceRefs"] = [];

  for (const item of rawRefs) {
      const ref = asRecord(item);
      const sourceTitle =
        typeof ref?.sourceTitle === "string"
          ? ref.sourceTitle.trim()
          : "";

      if (!sourceTitle) continue;

      const normalizedRef: AIGeneratedCard["sourceRefs"][number] = {
        sourceTitle
      };
      const locator =
        typeof ref?.locator === "string"
          ? ref.locator.trim()
          : "";
      const quote =
        typeof ref?.quote === "string"
          ? ref.quote.trim()
          : "";

      if (locator) normalizedRef.locator = locator;
      if (quote) normalizedRef.quote = quote;
      refs.push(normalizedRef);
  }

  return refs.length > 0 ? refs.slice(0, 3) : [{ sourceTitle: "药学知识点" }];
}

function normalizeTags(value: unknown) {
  const tags = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];

  return Array.from(new Set(["AI出卡", "资料", ...tags])).slice(0, 6);
}

function normalizeCard(card: RawCard): AIGeneratedCard | null {
  const question = typeof card.question === "string" ? card.question.trim() : "";
  const answer = typeof card.answer === "string" ? card.answer.trim() : "";
  const explanation = typeof card.explanation === "string" ? card.explanation.trim() : "";

  if (question.length < 4 || answer.length < 4) return null;

  const rawCardType = typeof card.cardType === "string" ? card.cardType : "";
  const rawDifficulty = typeof card.difficulty === "string" ? card.difficulty : "";
  const qualityScore = typeof card.qualityScore === "number" ? Math.round(card.qualityScore) : 88;

  return {
    question: question.slice(0, 140),
    answer: answer.slice(0, 420),
    explanation: explanation.slice(0, 280),
    cardType: CARD_TYPES.has(rawCardType as CardType) ? rawCardType as CardType : "qa",
    difficulty: DIFFICULTIES.has(rawDifficulty as Difficulty) ? rawDifficulty as Difficulty : "normal",
    qualityScore: Math.min(98, Math.max(70, qualityScore)),
    sourceRefs: normalizeSourceRefs(card.sourceRefs),
    tags: normalizeTags(card.tags)
  };
}

export async function generatePharmacyFlashcardsWithAI({
  materialTitle,
  chunks,
  requestedCount
}: {
  materialTitle: string;
  chunks: string[];
  requestedCount: number;
}) {
  const config = getAIConfig();

  if (config.provider !== "deepseek" || !config.apiKey) return [];

  const usage = await canRunDemoAI("card_generation");
  if (!usage.allowed) {
    console.warn(`[ai-card-generator] Demo daily limit reached (${usage.used}/${usage.limit}).`);
    return [];
  }

  const configuredDemoCardLimit = Number(process.env.DEMO_MAX_GENERATED_CARDS || 6);
  const demoCardLimit = process.env.PUBLIC_DEMO_MODE === "true"
    ? Number.isFinite(configuredDemoCardLimit)
      ? Math.min(12, Math.max(1, Math.floor(configuredDemoCardLimit)))
      : 6
    : requestedCount;
  const safeRequestedCount = Math.min(requestedCount, demoCardLimit);
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content: getSystemPrompt()
    },
    {
      role: "user",
      content: buildUserPrompt({
        materialTitle,
        chunks,
        requestedCount: safeRequestedCount
      })
    }
  ];

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
    body: JSON.stringify({
        model: config.model,
        messages,
        response_format: {
          type: "json_object"
        },
        temperature: 0.2,
        max_tokens: 6000,
        stream: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`DeepSeek API failed: ${response.status} ${errorText.slice(0, 160)}`);
    }

    const payload = await response.json() as DeepSeekResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) return [];

    const parsed = parseJSONContent(content);
    const parsedRecord = asRecord(parsed);
    const rawCards = Array.isArray(parsedRecord?.cards) ? parsedRecord.cards : [];

    const generatedCards = rawCards
      .map((card) => normalizeCard(asRecord(card) ?? {}))
      .filter((card): card is AIGeneratedCard => Boolean(card))
      .slice(0, safeRequestedCount);

    await recordAIRun({
      task: "card_generation",
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - startedAt,
      status: "success",
      metadata: {
        requestedCount: safeRequestedCount,
        generatedCount: generatedCards.length,
        demoMode: process.env.PUBLIC_DEMO_MODE === "true"
      }
    });

    return generatedCards;
  } catch (error) {
    console.warn("[ai-card-generator] Falling back to local card generation.", error);
    await recordAIRun({
      task: "card_generation",
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - startedAt,
      status: controller.signal.aborted ? "timeout" : "failed",
      errorCode: controller.signal.aborted ? "timeout" : "provider_error",
      metadata: {
        demoMode: process.env.PUBLIC_DEMO_MODE === "true"
      }
    });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
