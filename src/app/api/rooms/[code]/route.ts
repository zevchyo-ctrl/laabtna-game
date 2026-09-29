import { apiError, getRoomSnapshot, tokenFromRequest } from "@/lib/room-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    return Response.json(await getRoomSnapshot(code, tokenFromRequest(request)));
  } catch (error) {
    return apiError(error);
  }
}
