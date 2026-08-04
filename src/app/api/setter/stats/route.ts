import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCallStats } from "@/lib/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SETTER") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const calls = await prisma.call.findMany({
      where: { setterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { booking: true },
      take: 50,
    });

    const stats = computeCallStats(calls);

    return Response.json({ stats });
  } catch (error) {
    console.error("Error fetching setter stats:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
