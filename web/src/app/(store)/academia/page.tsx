import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seja Influence Majesté" };

/** Academia fitness desativada — redireciona para o fluxo de looks. */
export default function AcademiaPage() {
  redirect("/academia/galeria");
}
