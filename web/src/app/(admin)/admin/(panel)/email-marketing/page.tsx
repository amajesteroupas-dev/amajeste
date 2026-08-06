import { EmailMarketingAdmin } from "@/components/admin/EmailMarketingAdmin";

export const dynamic = "force-dynamic";

export default function AdminEmailMarketingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          E-mail marketing
        </h1>
        <p className="text-sm text-[#6b5f56] mt-1 max-w-2xl">
          Monte artes de e-mail e Instagram com prévia ao vivo. Disparos saem
          pelo Gmail da loja (
          <span className="whitespace-nowrap">Josianesantosmajeste@gmail.com</span>
          ) via SMTP — cada campo tem um “?” explicando o uso. Stories e Reels
          usam o tamanho oficial 1080×1920.
        </p>
      </div>
      <EmailMarketingAdmin />
    </div>
  );
}
