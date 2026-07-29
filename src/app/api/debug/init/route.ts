import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Create the schema if it doesn't exist
    // For SQLite with Prisma, we need to ensure tables exist

    // Try to create tables using raw SQL (PostgreSQL syntax)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Call" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "setterId" TEXT NOT NULL,
        "contractorName" TEXT NOT NULL,
        "phone" TEXT,
        "outcome" TEXT NOT NULL,
        "note" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("setterId") REFERENCES "User" ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Booking" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "callId" TEXT UNIQUE,
        "setterId" TEXT NOT NULL,
        "contractorName" TEXT NOT NULL,
        "phone" TEXT,
        "scheduledAt" TIMESTAMP NOT NULL,
        "setterNotes" TEXT NOT NULL,
        "closerBriefing" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
        "source" TEXT NOT NULL DEFAULT 'SETTER_DIRECT',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "viewedAt" TIMESTAMP,
        FOREIGN KEY ("callId") REFERENCES "Call" ("id"),
        FOREIGN KEY ("setterId") REFERENCES "User" ("id")
      );
    `);

    // Now verify the schema exists
    const userCount = await prisma.user.count();

    return Response.json({
      success: true,
      message: "Schema initialized successfully",
      userCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
