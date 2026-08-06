import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customer";
import { AccountAreaNav } from "@/components/store/AccountAreaNav";

export default async function AcademiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  const firstName = customer.name.split(" ")[0] || "Influence";

  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-[#f4efe9]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 15% -5%, rgba(196,122,126,0.22) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 95% 5%, rgba(201,162,74,0.12) 0%, transparent 50%), linear-gradient(185deg, #faf6f1 0%, #f1ebe4 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-12deg, transparent 0 10px, #2a2420 10px 11px)",
        }}
      />

      <div className="container-maj relative py-10 md:py-14">
        <header className="mb-8 md:mb-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7468] mb-2">
            Influence · Majesté
          </p>
          <h1
            className="text-4xl md:text-5xl text-[#2a2420] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seja Influence Majesté
          </h1>
          <p className="text-sm text-[#6b5f56] mb-6 max-w-xl">
            Olá, {firstName}. Publique seu look, inspire outras mulheres e
            ganhe cupom exclusivo em cada aprovação.
          </p>

          <AccountAreaNav variant="academia" />
        </header>

        <div className="border border-[#2a2420]/08 bg-white/85 backdrop-blur-sm p-5 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
