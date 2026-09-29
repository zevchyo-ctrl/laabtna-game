import { advanceSceneGame, confirmScene, revealScene, sceneApiError, sceneRoomByCode, selectSceneActor, startSceneGame } from "@/lib/scene-server";
export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const token = request.headers.get("x-laabtna-token"); if (!token) return Response.json({ error: "جلسة اللاعب غير موجودة" }, { status: 401 });
    const { code } = await context.params; const room = await sceneRoomByCode(code); const body = await request.json() as { action?: string; actorId?: string };
    if (body.action === "start") await startSceneGame(room.id, token);
    else if (body.action === "selectActor") await selectSceneActor(room.id, token, body.actorId);
    else if (body.action === "reveal") await revealScene(room.id, token);
    else if (body.action === "correct") await confirmScene(room.id, token, true);
    else if (body.action === "fail") await confirmScene(room.id, token, false);
    else if (body.action === "next") await advanceSceneGame(room.id, token);
    else return Response.json({ error: "أمر غير معروف" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) { return sceneApiError(error); }
}
