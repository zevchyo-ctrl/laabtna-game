import {
  advanceQuiz,
  answerQuiz,
  changeQuizQuestion,
  passQuiz,
  quizApiError,
  quizRoomByCode,
  startQuiz,
} from "@/lib/quiz-server";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const token = request.headers.get("x-laabtna-token");
    if (!token) return Response.json({ error: "جلسة اللاعب غير موجودة" }, { status: 401 });
    const { code } = await context.params;
    const room = await quizRoomByCode(code);
    const body = await request.json() as { action?: string; answer?: string };
    if (body.action === "start") await startQuiz(room.id, token);
    else if (body.action === "answer") await answerQuiz(room.id, token, body.answer);
    else if (body.action === "pass") await passQuiz(room.id, token);
    else if (body.action === "change") await changeQuizQuestion(room.id, token);
    else if (body.action === "next") await advanceQuiz(room.id, token);
    else return Response.json({ error: "أمر غير معروف" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    return quizApiError(error);
  }
}
