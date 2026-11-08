import { deleteOwnedReport, getFullReport } from "@/lib/reports";
import { parseWorkspaceKey } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  try {
    const report = await getFullReport(id);
    if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Could not load report." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const workspaceKey = parseWorkspaceKey(request);
  try {
    const deleted = await deleteOwnedReport(id, workspaceKey);
    if (!deleted)
      return Response.json(
        { error: "Report not found or not owned by this workspace." },
        { status: 403 },
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not delete report." }, { status: 500 });
  }
}
