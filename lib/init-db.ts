import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;
  initialized = true;

  try {
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
