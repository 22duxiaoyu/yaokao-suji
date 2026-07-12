CREATE EXTENSION IF NOT EXISTS "vector";
--> statement-breakpoint
CREATE TABLE "ai_probes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"review_log_id" integer,
	"trigger_result" text NOT NULL,
	"diagnosis" text NOT NULL,
	"suggestion_type" text NOT NULL,
	"suggested_question" text NOT NULL,
	"suggested_answer" text NOT NULL,
	"source_chunk_ids" integer[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"task" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_id" text,
	"prompt_version" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"status" text NOT NULL,
	"error_code" text,
	"cost_estimate" numeric(10, 4),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"material_id" integer,
	"knowledge_point_id" integer,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"card_type" text NOT NULL,
	"difficulty" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_chunk_ids" integer[] DEFAULT '{}' NOT NULL,
	"source_spans" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"flagged_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"user_id" integer,
	"source_type" text NOT NULL,
	"source_id" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"embedding_dimensions" integer DEFAULT 1024 NOT NULL,
	"source_span" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"node_type" text NOT NULL,
	"summary" text NOT NULL,
	"material_ids" integer[] DEFAULT '{}' NOT NULL,
	"card_ids" integer[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"material_id" integer,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"subject" text NOT NULL,
	"chapter" text,
	"difficulty" text DEFAULT 'normal' NOT NULL,
	"confidence" numeric(4, 2),
	"source_chunk_ids" integer[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"section_title" text,
	"content" text NOT NULL,
	"page_no" integer,
	"char_start" integer,
	"char_end" integer,
	"chunk_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text,
	"raw_text" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parsed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"reference_no" text,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"source" text,
	"status" text DEFAULT 'active' NOT NULL,
	"effective_date" date,
	"version" text
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"version" text NOT NULL,
	"task" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"schema_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rag_retrieval_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"material_id" integer,
	"query" text NOT NULL,
	"scope" text NOT NULL,
	"retrieved_chunk_ids" integer[] DEFAULT '{}' NOT NULL,
	"used_chunk_ids" integer[] DEFAULT '{}' NOT NULL,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"latency_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"result" text NOT NULL,
	"response_time_ms" integer,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_due_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"interval_days" numeric(8, 2) DEFAULT '0' NOT NULL,
	"ease_factor" numeric(5, 2) DEFAULT '2.50' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"ai_adjusted_reason" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '药考学员' NOT NULL,
	"review_preference" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_preference" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_probes" ADD CONSTRAINT "ai_probes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_probes" ADD CONSTRAINT "ai_probes_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_probes" ADD CONSTRAINT "ai_probes_review_log_id_review_logs_id_fk" FOREIGN KEY ("review_log_id") REFERENCES "public"."review_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_knowledge_point_id_knowledge_points_id_fk" FOREIGN KEY ("knowledge_point_id") REFERENCES "public"."knowledge_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding_chunks" ADD CONSTRAINT "embedding_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_nodes" ADD CONSTRAINT "knowledge_nodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_points" ADD CONSTRAINT "knowledge_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_points" ADD CONSTRAINT "knowledge_points_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_retrieval_logs" ADD CONSTRAINT "rag_retrieval_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_retrieval_logs" ADD CONSTRAINT "rag_retrieval_logs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_probes_user_status_idx" ON "ai_probes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ai_probes_card_idx" ON "ai_probes" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "ai_runs_user_task_idx" ON "ai_runs" USING btree ("user_id","task");--> statement-breakpoint
CREATE INDEX "ai_runs_created_at_idx" ON "ai_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_status_idx" ON "ai_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cards_user_status_idx" ON "cards" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "cards_material_idx" ON "cards" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "cards_knowledge_point_idx" ON "cards" USING btree ("knowledge_point_id");--> statement-breakpoint
CREATE INDEX "embedding_chunks_scope_source_idx" ON "embedding_chunks" USING btree ("scope","source_type");--> statement-breakpoint
CREATE INDEX "embedding_chunks_user_idx" ON "embedding_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "embedding_chunks_source_idx" ON "embedding_chunks" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_user_node_type_idx" ON "knowledge_nodes" USING btree ("user_id","node_type");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_parent_idx" ON "knowledge_nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "knowledge_points_user_subject_idx" ON "knowledge_points" USING btree ("user_id","subject");--> statement-breakpoint
CREATE INDEX "knowledge_points_material_idx" ON "knowledge_points" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_chunks_material_idx" ON "material_chunks" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_chunks_user_idx" ON "material_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "material_chunks_chunk_hash_idx" ON "material_chunks" USING btree ("chunk_hash");--> statement-breakpoint
CREATE INDEX "materials_user_status_idx" ON "materials" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "materials_uploaded_at_idx" ON "materials" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "platform_references_title_reference_idx" ON "platform_references" USING btree ("title","reference_no");--> statement-breakpoint
CREATE INDEX "platform_references_category_idx" ON "platform_references" USING btree ("category");--> statement-breakpoint
CREATE INDEX "prompt_versions_prompt_version_idx" ON "prompt_versions" USING btree ("prompt_id","version");--> statement-breakpoint
CREATE INDEX "prompt_versions_status_idx" ON "prompt_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rag_retrieval_logs_user_scope_idx" ON "rag_retrieval_logs" USING btree ("user_id","scope");--> statement-breakpoint
CREATE INDEX "rag_retrieval_logs_material_idx" ON "rag_retrieval_logs" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "rag_retrieval_logs_created_at_idx" ON "rag_retrieval_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "review_logs_user_reviewed_idx" ON "review_logs" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_logs_card_idx" ON "review_logs" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "review_schedules_user_due_idx" ON "review_schedules" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "review_schedules_card_idx" ON "review_schedules" USING btree ("card_id");
