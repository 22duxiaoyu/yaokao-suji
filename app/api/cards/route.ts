import { type CardStatus, getCards } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as CardStatus | null;

  return Response.json({
    ok: true,
    cards: await getCards(status || undefined)
  });
}
