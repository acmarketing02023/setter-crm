import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        name: "Brandon Cervantes",
        email: "brandon.cervantes@setter-crm.local",
        passwordHash: "",
        role: "SETTER",
      },
    });
    console.log("✅ Added Brandon Cervantes:", user.id);
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("✅ Brandon already exists");
    } else {
      console.error("Error:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
