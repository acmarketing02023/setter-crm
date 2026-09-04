import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const password = "26749531Bo";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: "brandon.cervantes@setter-crm.local" },
      update: { passwordHash },
      create: {
        name: "Brandon Cervantes",
        email: "brandon.cervantes@setter-crm.local",
        passwordHash,
        role: "SETTER",
      },
    });

    return Response.json({
      success: true,
      message: "Brandon Cervantes has been added/updated!",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
