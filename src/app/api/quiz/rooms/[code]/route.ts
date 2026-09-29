import { quizApiError, quizSnapshot } from "@/lib/quiz-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const token = request.headers.get("x-laabtna-token");
    if (!token) return Response.json({ error: "جلسة اللاعب غير موجودة" }, { status: 401 });
    const { code } = await context.params;
    return Response.json(await quizSnapshot(code, token));
  } catch (error) {
    return quizApiError(error);
  }
}
