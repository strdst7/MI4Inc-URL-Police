import { listReports } from "@/lib/reports";
import { parseWorkspaceKey } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const workspaceKey = parseWorkspaceKey(request);
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "40", 10);
  try {
    const items = await listReports(workspaceKey, Number.isFinite(limit) ? limit : 40);
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Could not load reports." }, { status: 500 });
  }
}
