import { advanceRushGame, rushApiError, rushRoomByCode, startRushGame, submitRushAnswer } from "@/lib/rush-server";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const token = request.headers.get("x-laabtna-token");
    if (!token) return Response.json({ error: "جلسة اللاعب غير موجودة" }, { status: 401 });
    const { code } = await context.params;
    const room = await rushRoomByCode(code);
    const body = (await request.json()) as { action?: string; submission?: unknown };
    if (body.action === "start") await startRushGame(room.id, token);
    else if (body.action === "submit") await submitRushAnswer(room.id, token, body.submission);
    else if (body.action === "next") await advanceRushGame(room.id, token);
    else return Response.json({ error: "أمر غير معروف" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    return rushApiError(error);
  }
}
