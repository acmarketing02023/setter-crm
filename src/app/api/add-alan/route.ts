import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function POST() {
  try {
    // Check if Alan already exists
    const alanExists = await prisma.user.findUnique({
      where: { email: "alanortiz44@gmail.com" },
    });

    if (alanExists) {
      return Response.json({
        success: true,
        message: "Alan Ortiz already exists in database",
      });
    }

    // Hash Alan's password
    const alanPasswordHash = await bcrypt.hash("26749531Bo", 10);

    // Create Alan
    const alan = await prisma.user.create({
      data: {
        name: "Alan Ortiz",
        email: "alanortiz44@gmail.com",
        passwordHash: alanPasswordHash,
        role: Role.SETTER,
      },
    });

    return Response.json({
      success: true,
      message: "Alan Ortiz added successfully",
      user: { id: alan.id, name: alan.name, email: alan.email },
    });
  } catch (error) {
    console.error("Error adding Alan:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
