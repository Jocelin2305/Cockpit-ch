import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCSV, todayISO } from "@/lib/prospecting";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.membership) return new Response("Non autorisé", { status: 401 });
  const searchId = new URL(request.url).searchParams.get("recherche");
  const rows = await db.prospect.findMany({
    where: { organizationId: session.membership.organizationId, ...(searchId ? { searchId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return new Response(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Prospects_${todayISO()}.csv"`,
    },
  });
}
