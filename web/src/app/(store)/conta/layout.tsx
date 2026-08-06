import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/customer";
import { AccountAreaNav } from "@/components/store/AccountAreaNav";

export default async function ContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  const firstName = customer.name.split(" ")[0] || "Cliente";

  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-[#f4efe9]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 0% 0%, rgba(196,122,126,0.18) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 10%, rgba(168,124,106,0.14) 0%, transparent 45%), linear-gradient(180deg, #faf6f1 0%, #f4efe9 40%, #efe8e0 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #2a2420 0 1px, transparent 1px 28px), repeating-linear-gradient(0deg, #2a2420 0 1px, transparent 1px 28px)",
        }}
      />

      <div className="container-maj relative py-10 md:py-14">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7468] mb-2">
                Majesté · Minha conta
              </p>
              <h1
                className="text-4xl md:text-5xl text-[#2a2420]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Olá, {firstName}
              </h1>
              <p className="text-sm text-[#6b5f56] mt-2 max-w-md">
                Pedidos, favoritos e o programa Influence Majesté.
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468] hover:text-[#2a2420] border border-[#2a2420]/15 bg-white/70 px-3 py-2"
              >
                Sair
              </button>
            </form>
          </div>

          <AccountAreaNav variant="conta" />
        </header>

        <div className="border border-[#2a2420]/08 bg-white/85 backdrop-blur-sm p-5 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
