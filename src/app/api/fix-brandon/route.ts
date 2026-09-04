import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const password = "26749531Bo";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { email: "brandon.cervantes@setter-crm.local" },
      data: { passwordHash },
    });

    return Response.json({
      success: true,
      message: "Brandon's password has been fixed!",
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
