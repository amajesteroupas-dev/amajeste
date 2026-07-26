export default function ContactPage() {
  return (
    <div className="container-maj py-14 max-w-2xl">
      <h1 className="text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
        Contato
      </h1>
      <p className="text-muted mb-8">
        Fale com a Majesté. Respondemos pelo WhatsApp e e-mail.
      </p>
      <form className="space-y-3 border border-line bg-surface p-6">
        <input className="input" placeholder="Nome" required />
        <input className="input" type="email" placeholder="E-mail" required />
        <input className="input" placeholder="WhatsApp" />
        <textarea className="input min-h-32" placeholder="Mensagem" required />
        <button type="submit" className="btn btn-primary">
          Enviar
        </button>
      </form>
    </div>
  );
}
