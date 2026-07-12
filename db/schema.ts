import {
  customType,
  date,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const vector = customType<{
  data: number[];
  driverData: string;
  config: {
    dimensions: number;
  };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1024})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .filter(Boolean)
      .map(Number);
  }
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("药考学员"),
  reviewPreference: jsonb("review_preference").$type<Record<string, unknown>>().notNull().default({}),
  aiPreference: jsonb("ai_preference").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    sourceType: text("source_type", { enum: ["upload", "paste"] }).notNull(),
    fileType: text("file_type", { enum: ["pdf", "word", "ppt", "text", "audio", "video", "image", "other"] }).notNull(),
    fileUrl: text("file_url"),
    rawText: text("raw_text"),
    status: text("status", { enum: ["uploaded", "parsing", "parsed", "indexed", "failed"] }).notNull().default("uploaded"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    parsedAt: timestamp("parsed_at", { withTimezone: true })
  },
  (table) => ({
    userStatusIdx: index("materials_user_status_idx").on(table.userId, table.status),
    uploadedAtIdx: index("materials_uploaded_at_idx").on(table.uploadedAt)
  })
);

export const materialChunks = pgTable(
  "material_chunks",
  {
    id: serial("id").primaryKey(),
    materialId: integer("material_id").notNull().references(() => materials.id),
    userId: integer("user_id").notNull().references(() => users.id),
    chunkIndex: integer("chunk_index").notNull(),
    sectionTitle: text("section_title"),
    content: text("content").notNull(),
    pageNo: integer("page_no"),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
    chunkHash: text("chunk_hash"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    materialIdx: index("material_chunks_material_idx").on(table.materialId),
    userIdx: index("material_chunks_user_idx").on(table.userId),
    chunkHashIdx: index("material_chunks_chunk_hash_idx").on(table.chunkHash)
  })
);

export const platformReferences = pgTable(
  "platform_references",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    referenceNo: text("reference_no"),
    content: text("content").notNull(),
    category: text("category").notNull(),
    source: text("source"),
    status: text("status", { enum: ["active", "amended", "expired"] }).notNull().default("active"),
    effectiveDate: date("effective_date"),
    version: text("version")
  },
  (table) => ({
    titleReferenceIdx: index("platform_references_title_reference_idx").on(table.title, table.referenceNo),
    categoryIdx: index("platform_references_category_idx").on(table.category)
  })
);

export const knowledgePoints = pgTable(
  "knowledge_points",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    materialId: integer("material_id").references(() => materials.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    subject: text("subject").notNull(),
    chapter: text("chapter"),
    difficulty: text("difficulty", { enum: ["easy", "normal", "hard"] }).notNull().default("normal"),
    confidence: numeric("confidence", { precision: 4, scale: 2 }),
    sourceChunkIds: integer("source_chunk_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userSubjectIdx: index("knowledge_points_user_subject_idx").on(table.userId, table.subject),
    materialIdx: index("knowledge_points_material_idx").on(table.materialId)
  })
);

export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    materialId: integer("material_id").references(() => materials.id),
    knowledgePointId: integer("knowledge_point_id").references(() => knowledgePoints.id),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    explanation: text("explanation").notNull().default(""),
    cardType: text("card_type", { enum: ["qa", "cloze", "compare", "case_rule", "drug_memory"] }).notNull(),
    difficulty: text("difficulty", { enum: ["easy", "normal", "hard"] }).notNull().default("normal"),
    status: text("status", { enum: ["generated", "active", "edited", "flagged", "deleted"] }).notNull().default("generated"),
    qualityScore: integer("quality_score").notNull().default(0),
    sourceRefs: jsonb("source_refs").$type<Array<{ sourceTitle: string; locator?: string; quote?: string }>>().notNull().default([]),
    sourceChunkIds: integer("source_chunk_ids").array().notNull().default([]),
    sourceSpans: jsonb("source_spans").$type<Array<{ chunkId: number; quote?: string; pageNo?: number }>>().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    isFavorite: boolean("is_favorite").notNull().default(false),
    flaggedReason: text("flagged_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userStatusIdx: index("cards_user_status_idx").on(table.userId, table.status),
    materialIdx: index("cards_material_idx").on(table.materialId),
    knowledgePointIdx: index("cards_knowledge_point_idx").on(table.knowledgePointId)
  })
);

export const reviewSchedules = pgTable(
  "review_schedules",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    cardId: integer("card_id").notNull().references(() => cards.id),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    intervalDays: numeric("interval_days", { precision: 8, scale: 2 }).notNull().default("0"),
    easeFactor: numeric("ease_factor", { precision: 5, scale: 2 }).notNull().default("2.50"),
    priority: integer("priority").notNull().default(0),
    aiAdjustedReason: text("ai_adjusted_reason")
  },
  (table) => ({
    userDueIdx: index("review_schedules_user_due_idx").on(table.userId, table.dueAt),
    cardIdx: index("review_schedules_card_idx").on(table.cardId)
  })
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    cardId: integer("card_id").notNull().references(() => cards.id),
    result: text("result", { enum: ["remembered", "fuzzy", "forgotten", "wrong"] }).notNull(),
    responseTimeMs: integer("response_time_ms"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true })
  },
  (table) => ({
    userReviewedIdx: index("review_logs_user_reviewed_idx").on(table.userId, table.reviewedAt),
    cardIdx: index("review_logs_card_idx").on(table.cardId)
  })
);

export const aiProbes = pgTable(
  "ai_probes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    cardId: integer("card_id").notNull().references(() => cards.id),
    reviewLogId: integer("review_log_id").references(() => reviewLogs.id),
    triggerResult: text("trigger_result", { enum: ["fuzzy", "forgotten"] }).notNull(),
    diagnosis: text("diagnosis").notNull(),
    suggestionType: text("suggestion_type", { enum: ["compare_card", "cloze_card", "simpler_card", "drug_memory_card"] }).notNull(),
    suggestedQuestion: text("suggested_question").notNull(),
    suggestedAnswer: text("suggested_answer").notNull(),
    sourceChunkIds: integer("source_chunk_ids").array().notNull().default([]),
    status: text("status", { enum: ["suggested", "accepted", "dismissed", "generated"] }).notNull().default("suggested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userStatusIdx: index("ai_probes_user_status_idx").on(table.userId, table.status),
    cardIdx: index("ai_probes_card_idx").on(table.cardId)
  })
);

export const knowledgeNodes = pgTable(
  "knowledge_nodes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    parentId: integer("parent_id"),
    title: text("title").notNull(),
    nodeType: text("node_type", { enum: ["system", "subject", "chapter", "concept"] }).notNull(),
    summary: text("summary").notNull(),
    materialIds: integer("material_ids").array().notNull().default([]),
    cardIds: integer("card_ids").array().notNull().default([])
  },
  (table) => ({
    userNodeTypeIdx: index("knowledge_nodes_user_node_type_idx").on(table.userId, table.nodeType),
    parentIdx: index("knowledge_nodes_parent_idx").on(table.parentId)
  })
);

export const embeddingChunks = pgTable(
  "embedding_chunks",
  {
    id: serial("id").primaryKey(),
    scope: text("scope", { enum: ["platform", "user"] }).notNull(),
    userId: integer("user_id").references(() => users.id),
    sourceType: text("source_type", { enum: ["material", "platform_reference", "card", "knowledge_point"] }).notNull(),
    sourceId: integer("source_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    embeddingModel: text("embedding_model").notNull().default("text-embedding-3-small"),
    embeddingDimensions: integer("embedding_dimensions").notNull().default(1024),
    sourceSpan: jsonb("source_span").$type<{ pageNo?: number; charStart?: number; charEnd?: number; sectionTitle?: string }>().notNull().default({}),
    visibility: text("visibility", { enum: ["private", "platform"] }).notNull().default("private"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => ({
    scopeSourceIdx: index("embedding_chunks_scope_source_idx").on(table.scope, table.sourceType),
    userIdx: index("embedding_chunks_user_idx").on(table.userId),
    sourceIdx: index("embedding_chunks_source_idx").on(table.sourceType, table.sourceId)
  })
);

export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: serial("id").primaryKey(),
    promptId: text("prompt_id").notNull(),
    version: text("version").notNull(),
    task: text("task").notNull(),
    status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
    schemaName: text("schema_name"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true })
  },
  (table) => ({
    promptVersionIdx: index("prompt_versions_prompt_version_idx").on(table.promptId, table.version),
    statusIdx: index("prompt_versions_status_idx").on(table.status)
  })
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    task: text("task").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptId: text("prompt_id"),
    promptVersion: text("prompt_version"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    status: text("status", { enum: ["success", "failed", "timeout"] }).notNull(),
    errorCode: text("error_code"),
    costEstimate: numeric("cost_estimate", { precision: 10, scale: 4 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userTaskIdx: index("ai_runs_user_task_idx").on(table.userId, table.task),
    createdAtIdx: index("ai_runs_created_at_idx").on(table.createdAt),
    statusIdx: index("ai_runs_status_idx").on(table.status)
  })
);

export const ragRetrievalLogs = pgTable(
  "rag_retrieval_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    materialId: integer("material_id").references(() => materials.id),
    query: text("query").notNull(),
    scope: text("scope", { enum: ["single_material", "personal", "platform", "mixed"] }).notNull(),
    retrievedChunkIds: integer("retrieved_chunk_ids").array().notNull().default([]),
    usedChunkIds: integer("used_chunk_ids").array().notNull().default([]),
    scores: jsonb("scores").$type<Array<{ chunkId: number; score: number; reason?: string }>>().notNull().default([]),
    latencyMs: integer("latency_ms"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userScopeIdx: index("rag_retrieval_logs_user_scope_idx").on(table.userId, table.scope),
    materialIdx: index("rag_retrieval_logs_material_idx").on(table.materialId),
    createdAtIdx: index("rag_retrieval_logs_created_at_idx").on(table.createdAt)
  })
);
