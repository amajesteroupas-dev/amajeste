import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export async function requireCustomer() {
  const mobile = await getMobileAuthUser();
  if (mobile) {
    if (mobile.role === "ADMIN" || mobile.role === "STAFF") {
      return null;
    }
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ userId: mobile.sub }, { email: mobile.email }],
      },
    });
    if (!customer) return null;
    if (!customer.userId) {
      return prisma.customer.update({
        where: { id: customer.id },
        data: { userId: mobile.sub },
      });
    }
    return customer;
  }

  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role;
  if (role === "ADMIN" || role === "STAFF") {
    return null;
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ userId: session.user.id }, { email: session.user.email || "" }],
    },
  });

  if (!customer) return null;

  if (!customer.userId) {
    return prisma.customer.update({
      where: { id: customer.id },
      data: { userId: session.user.id },
    });
  }

  return customer;
}

export async function requireCustomerSession() {
  const session = await auth();
  if (!session?.user?.id) {
    const mobile = await getMobileAuthUser();
    if (!mobile) return { session: null, customer: null };
    const customer = await requireCustomer();
    return {
      session: {
        user: {
          id: mobile.sub,
          email: mobile.email,
          name: mobile.name,
          role: mobile.role,
        },
      },
      customer,
    };
  }
  const customer = await requireCustomer();
  return { session, customer };
}
