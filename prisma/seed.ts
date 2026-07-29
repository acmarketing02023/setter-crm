import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
  console.log(`${role}: ${email} / ${password}`);
}

async function main() {
  await upsertUser("Owner", "acmarketing02023@gmail.com", "64186418Am", Role.OWNER);
  await upsertUser("Setter", "angelcruzgabriel44@gmail.com", "15598654Aa", Role.SETTER);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
