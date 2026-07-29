import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;
  initialized = true;

  try {
    // First, ensure schema exists (PostgreSQL syntax)
    try {
      // Create enum types
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "Role" AS ENUM ('SETTER', 'OWNER');
      `).catch(() => {
        // Enum already exists
      });

      await prisma.$executeRawUnsafe(`
        CREATE TYPE "CallOutcome" AS ENUM ('NO_ANSWER', 'NOT_INTERESTED', 'CALLBACK', 'BOOKED');
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'WON', 'LOST', 'CANCELED');
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        CREATE TYPE "BookingSource" AS ENUM ('COLD_CALL', 'SETTER_DIRECT', 'LANDING_PAGE', 'OTHER');
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          "role" "Role" NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Call" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "setterId" TEXT NOT NULL,
          "contractorName" TEXT NOT NULL,
          "phone" TEXT,
          "outcome" "CallOutcome" NOT NULL,
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
          "status" "BookingStatus" NOT NULL DEFAULT 'SCHEDULED',
          "source" "BookingSource" NOT NULL DEFAULT 'SETTER_DIRECT',
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "viewedAt" TIMESTAMP,
          FOREIGN KEY ("callId") REFERENCES "Call" ("id"),
          FOREIGN KEY ("setterId") REFERENCES "User" ("id")
        );
      `);
    } catch (schemaError) {
      console.log("Schema already exists or error creating it:", (schemaError as any).message?.slice(0, 100));
    }

    // Check if users already exist
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      console.log("Database empty, seeding with test users...");

      // Hash passwords
      const ownerPasswordHash = await bcrypt.hash("64186418Am", 10);
      const setterPasswordHash = await bcrypt.hash("15598654Aa", 10);

      // Create users
      await prisma.user.createMany({
        data: [
          {
            name: "Owner",
            email: "acmarketing02023@gmail.com",
            passwordHash: ownerPasswordHash,
            role: Role.OWNER,
          },
          {
            name: "Setter",
            email: "angelcruzgabriel44@gmail.com",
            passwordHash: setterPasswordHash,
            role: Role.SETTER,
          },
        ],
      });

      console.log("Database seeded successfully!");
      console.log("Owner: acmarketing02023@gmail.com / 64186418Am");
      console.log("Setter: angelcruzgabriel44@gmail.com / 15598654Aa");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Don't throw - allow app to continue even if seeding fails
  }
}
