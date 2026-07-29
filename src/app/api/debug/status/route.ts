import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Count users in database
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return Response.json({
      status: "ok",
      database: "connected",
      userCount,
      users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Extract and mask DATABASE_URL for debugging
    const dbUrl = process.env.DATABASE_URL || "NOT_SET";
    const maskedUrl = dbUrl !== "NOT_SET"
      ? dbUrl.replace(/:[^@]*@/, ":***@").slice(0, 100) + "..."
      : "NOT_SET";

    return Response.json(
      {
        status: "error",
        database: "failed",
        error: errorMessage,
        databaseUrlConfigured: dbUrl !== "NOT_SET",
        databaseUrlMasked: maskedUrl,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
