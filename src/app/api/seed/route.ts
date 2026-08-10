import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function POST() {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return Response.json({
        success: true,
        message: "Database already seeded",
        userCount,
      });
    }

    // Hash passwords
    const ownerPasswordHash = await bcrypt.hash("64186418Am", 10);
    const angelPasswordHash = await bcrypt.hash("15598654Aa", 10);
    const alanPasswordHash = await bcrypt.hash("26749531Bo", 10);

    // Create users
    const result = await prisma.user.createMany({
      data: [
        {
          name: "Owner",
          email: "acmarketing02023@gmail.com",
          passwordHash: ownerPasswordHash,
          role: Role.OWNER,
        },
        {
          name: "Angel Cruz",
          email: "angelcruzgabriel44@gmail.com",
          passwordHash: angelPasswordHash,
          role: Role.SETTER,
        },
        {
          name: "Alan Ortiz",
          email: "alanortiz44@gmail.com",
          passwordHash: alanPasswordHash,
          role: Role.SETTER,
        },
      ],
    });

    return Response.json({
      success: true,
      message: "Database seeded successfully",
      usersCreated: result.count,
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

// Also make it work with GET for easier testing
export async function GET() {
  return POST();
}
