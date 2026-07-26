const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log("DB already seeded, skipping.");
      return;
    }
  } catch (e) {
    console.warn("Seed check failed, continuing...", e.message);
  } finally {
    await prisma.$disconnect();
  }

  // Fallback: run seed via child if empty — keep simple for docker
  require("child_process").execSync("npx tsx prisma/seed.ts", {
    stdio: "inherit",
    env: process.env,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
