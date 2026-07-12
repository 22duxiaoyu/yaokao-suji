import { and, count, eq, gte } from "drizzle-orm";

import { getDb } from "@/db/client";
import { aiRuns } from "@/db/schema";

const DEFAULT_USER_ID = 1;

function getDailyLimit() {
  if (process.env.PUBLIC_DEMO_MODE !== "true") return 0;

  const configured = Number(process.env.DEMO_AI_DAILY_LIMIT || 20);
  return Number.isFinite(configured) ? Math.min(200, Math.max(0, Math.floor(configured))) : 20;
}

export async function canRunDemoAI(task: string) {
  const limit = getDailyLimit();

  if (limit === 0) return { allowed: true, used: 0, limit: 0 };

  const db = getDb();
  if (!db) return { allowed: true, used: 0, limit };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const rows = await db
      .select({ value: count(aiRuns.id) })
      .from(aiRuns)
      .where(and(eq(aiRuns.userId, DEFAULT_USER_ID), eq(aiRuns.task, task), gte(aiRuns.createdAt, startOfDay)));
    const used = rows[0]?.value ?? 0;

    return { allowed: used < limit, used, limit };
  } catch (error) {
    console.warn("[ai-usage] Usage check unavailable; allowing demo request.", error);
    return { allowed: true, used: 0, limit };
  }
}

export async function recordAIRun({
  task,
  provider,
  model,
  latencyMs,
  status,
  errorCode,
  metadata = {}
}: {
  task: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: "success" | "failed" | "timeout";
  errorCode?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return;

  try {
    await db.insert(aiRuns).values({
      userId: DEFAULT_USER_ID,
      task,
      provider,
      model,
      promptId: "pharmacy-card-generation",
      promptVersion: "v1.0",
      latencyMs,
      status,
      errorCode,
      metadata
    });
  } catch (error) {
    console.warn("[ai-usage] Failed to persist AI run metadata.", error);
  }
}
