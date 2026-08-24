const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const email = "meyrerosemicro@gmail.com";
  const norm = email.trim().toLowerCase();

  const users = await p.user.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { email: { equals: norm, mode: "insensitive" } },
        { email: { contains: "meyrerosemicro", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });

  const customers = await p.customer.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { email: { contains: "meyrerosemicro", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      userId: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          hasPasswordHash: Boolean(u.passwordHash),
          passwordHashLen: u.passwordHash ? String(u.passwordHash).length : 0,
          passwordLooksBcrypt: Boolean(
            u.passwordHash && String(u.passwordHash).startsWith("$2")
          ),
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          customerId: u.customer?.id || null,
          customerEmail: u.customer?.email || null,
        })),
        orphanCustomers: customers.filter(
          (c) => !users.some((u) => u.id === c.userId || u.customer?.id === c.id)
        ),
        customers,
      },
      null,
      2
    )
  );

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
