import { isAICardGenerationConfigured } from "@/lib/server/ai-card-generator";
import { getFileStorageMode } from "@/lib/server/object-storage";
import { getStoreMode } from "@/lib/server/study-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    app: "药考速记",
    mode: process.env.PUBLIC_DEMO_MODE === "true" ? "portfolio-demo" : "development",
    services: {
      database: getStoreMode(),
      fileStorage: getFileStorageMode(),
      ai: isAICardGenerationConfigured() ? "deepseek" : "fallback"
    },
    limits: process.env.PUBLIC_DEMO_MODE === "true"
      ? {
          maxUploadMb: Number(process.env.DEMO_MAX_UPLOAD_MB || 4),
          aiRunsPerDay: Number(process.env.DEMO_AI_DAILY_LIMIT || 20),
          maxCardsPerRun: Number(process.env.DEMO_MAX_GENERATED_CARDS || 6)
        }
      : null
  });
}
