import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCallStats } from "@/lib/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: "desc" },
      include: { setter: { select: { name: true } } },
      take: 50,
    });

    const stats = computeCallStats(calls);

    return Response.json({ stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
