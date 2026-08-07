"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogIn, UserRound, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/utils";
import { formatCep } from "@/lib/cep";
import { formatCpf } from "@/lib/cpf";
import { attributionForCheckout } from "@/lib/traffic-attribution-client";
import {
  getCartSessionIdPublic,
  saveCheckoutContact,
} from "@/components/store/CartAbandonTracker";
import type { ShippingQuote } from "@/lib/shipping";
import {
  AddressFields,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/components/store/AddressFields";
import {
  CheckoutPaymentMethods,
  type PagBankPayType,
} from "@/components/store/CheckoutPaymentMethods";
import { defaultPayment } from "@/lib/site";
import { useSitePromo } from "@/components/store/SitePromoContext";
import { computeCheckoutDiscounts, pickBestPromotion } from "@/lib/promotion-pricing";

type SavedAddress = {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const sitePromo = useSitePromo();
  const { items, subtotal, clear, removeItem, shippingZip, setShippingZip } =
    useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [method, setMethod] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    percent: number;
  } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [payMethods, setPayMethods] = useState<
    { id: string; label: string; description: string }[]
  >([]);
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [psPublicKey, setPsPublicKey] = useState("");
  const [psType, setPsType] = useState<PagBankPayType>("CREDIT_CARD");
  /** Parcelas usadas para calcular desconto de cartão (preview + pedido). */
  const [cardInstallments, setCardInstallments] = useState(1);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  /** Visitante escolheu comprar sem login */
  const [guestChosen, setGuestChosen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  /** saved = endereço da conta | new = outro endereço */
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("Entrega");

  const deliveryFields: AddressFieldsValue = {
    zip,
    street,
    number,
    complement,
    neighborhood,
    city,
    state: stateUf,
    label: newAddrLabel,
  };

  function applyAddressFields(v: AddressFieldsValue) {
    setZip(v.zip);
    setStreet(v.street);
    setNumber(v.number);
    setComplement(v.complement);
    setNeighborhood(v.neighborhood);
    setCity(v.city);
    setStateUf(v.state);
    if (v.label) setNewAddrLabel(v.label);
    const digits = v.zip.replace(/\D/g, "");
    if (digits.length === 8) setShippingZip(formatCep(digits));
  }

  function applySavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setAddressMode("saved");
    setZip(formatCep(addr.zipCode));
    setShippingZip(formatCep(addr.zipCode));
    setStreet(addr.street || "");
    setNumber(addr.number || "");
    setComplement(addr.complement || "");
    setNeighborhood(addr.neighborhood || "");
    setCity(addr.city || "");
    setStateUf(addr.state || "");
  }

  const isCustomer =
    Boolean(session?.user) &&
    (session?.user as { role?: string }).role === "CUSTOMER";
  const showIdentityChoice =
    sessionStatus !== "loading" && !isCustomer && !guestChosen;
  const showCheckoutForm = isCustomer || guestChosen;

  useEffect(() => {
    if (items.length === 0 && !preferenceId) router.replace("/carrinho");
  }, [items.length, preferenceId, router]);

  useEffect(() => {
    (async () => {
      const [methodsRes, configRes] = await Promise.all([
        fetch("/api/payments/methods"),
        fetch("/api/payments/config"),
      ]);
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        const list = data.methods || [];
        setPayMethods(list);
        if (list[0] && !method) setMethod(list[0].id);
      }
      if (configRes.ok) {
        const cfg = await configRes.json();
        setMpPublicKey(cfg.publicKey || "");
        setPsPublicKey(cfg.pagseguroPublicKey || "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function prefills() {
      if (!isCustomer) return;
      const res = await fetch("/api/account/profile");
      if (!res.ok) return;
      const p = await res.json();
      setName(p.name || "");
      setEmail(p.email || "");
      setPhone(p.phone || "");
      if (p.cpf) setCpf(formatCpf(p.cpf));
      const list = Array.isArray(p.addresses) ? (p.addresses as SavedAddress[]) : [];
      setSavedAddresses(list);
      const primary =
        list.find((a) => a.isDefault) || list[0] || null;
      if (primary) {
        applySavedAddress(primary);
      } else {
        setAddressMode("new");
      }
    }
    prefills();
  }, [isCustomer]);

  async function lookupCep(zipOverride?: string) {
    const digits = (zipOverride || zip).replace(/\D/g, "");
    if (digits.length !== 8) return;
    const res = await fetch(`/api/cep/${digits}`);
    if (!res.ok) return;
    const data = await res.json();
    setStreet(data.street || "");
    setNeighborhood(data.neighborhood || "");
    setCity(data.city || "");
    setStateUf(data.state || "");
  }

  async function onCpfBlur() {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return;
    const res = await fetch(`/api/cpf/${digits}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.name && !name.trim()) setName(data.name);
  }

  async function quoteFreight(zipOverride?: string) {
    setError("");
    const toZip = (zipOverride || zip).replace(/\D/g, "");
    if (toZip.length === 8 && (!isCustomer || addressMode === "new")) {
      await lookupCep(toZip);
    }
    if (toZip.length < 8) {
      setError("Informe um CEP válido para calcular o frete");
      return;
    }
    if (toZip.length === 8) setShippingZip(formatCep(toZip));
    const res = await fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toZip,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao cotar frete");
      return;
    }
    setQuotes(data.quotes);
    if (data.quotes?.[0]) setShippingId(data.quotes[0].id);
  }

  useEffect(() => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length === 8 && (isCustomer || guestChosen)) {
      quoteFreight(digits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId]);

  /** CEP estimado na página do produto → checkout sem cadastro */
  useEffect(() => {
    if (!guestChosen || isCustomer) return;
    const current = zip.replace(/\D/g, "");
    if (current.length === 8) {
      quoteFreight(current);
      return;
    }
    const stored = (shippingZip || "").replace(/\D/g, "");
    if (stored.length === 8) {
      setZip(formatCep(stored));
      quoteFreight(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestChosen]);

  const selectedShipping = quotes.find((q) => q.id === shippingId);
  const shippingCost = selectedShipping?.price || 0;
  const cartSub = subtotal();
  const isPixMethod =
    method === "pix" ||
    method === "pagseguro_pix" ||
    (method === "pagseguro" && psType === "PIX");
  const isCardMethod =
    method === "credit_card" ||
    method === "pagseguro_card" ||
    (method === "pagseguro" && psType === "CREDIT_CARD");
  const matchedPromo = pickBestPromotion(sitePromo.promotions, {
    isPix: isPixMethod,
    isCard: isCardMethod,
    installments: isCardMethod ? cardInstallments : 1,
  });
  const {
    siteDiscount,
    couponDiscount,
    pixDiscount,
    totalDiscount: discount,
  } = computeCheckoutDiscounts({
    subtotal: cartSub,
    couponPercent: couponApplied?.percent ?? 0,
    isPix: isPixMethod,
    isCard: isCardMethod,
    installments: cardInstallments,
    matchedPromo,
    basePixPercent: defaultPayment.pixDiscountPercent,
  });
  const total = Math.max(0, cartSub + shippingCost - discount);
  const loginHref = `/entrar?callbackUrl=${encodeURIComponent("/checkout")}`;
  const registerHref = `/cadastro?callbackUrl=${encodeURIComponent("/checkout")}`;

  async function applyCoupon() {
    setCouponMsg("");
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponApplied(null);
      setCouponMsg(data.error || "Cupom inválido");
      return;
    }
    setCouponApplied({ code: data.code, percent: data.percent });
    setCouponMsg(`Cupom ${data.code} · −${data.percent}% no subtotal`);
  }

  async function placeOrder(extra?: {
    cardToken?: string;
    paymentMethodId?: string;
    installments?: number;
    issuerId?: string;
    encryptedCard?: string;
    pagseguroType?: PagBankPayType;
    holderName?: string;
    holderTaxId?: string;
  }) {
    if (extra?.installments != null) {
      setCardInstallments(Number(extra.installments) || 1);
    }
    setLoading(true);
    setError("");
    setPreferenceId(null);

    try {
      if (isCustomer && addressMode === "new" && saveNewAddress) {
        await fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: newAddrLabel || "Entrega",
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUf,
            zipCode: zip,
            isDefault: savedAddresses.length === 0,
          }),
        });
      }

      const attribution = attributionForCheckout();
      saveCheckoutContact(email, phone);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          cpf,
          shippingStreet: street,
          shippingNumber: number,
          shippingComplement: complement || undefined,
          shippingNeighborhood: neighborhood,
          shippingCity: city,
          shippingState: stateUf,
          shippingZip: zip,
          shippingMethod: selectedShipping
            ? selectedShipping.local
              ? `${selectedShipping.company} — ${selectedShipping.name}`
              : `${selectedShipping.company} ${selectedShipping.name}`
            : "A combinar",
          shippingServiceId: selectedShipping?.id || undefined,
          shippingCost,
          paymentMethod: method,
          pagseguroType:
            method === "pagseguro_pix"
              ? "PIX"
              : method === "pagseguro_card"
                ? "CREDIT_CARD"
                : method === "pagseguro"
                  ? extra?.pagseguroType || psType
                  : undefined,
          couponCode: couponApplied?.code || undefined,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          attribution: attribution || undefined,
          cartSessionId: getCartSessionIdPublic() || undefined,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no pedido");

      if (data.preferenceId) {
        setPreferenceId(String(data.preferenceId));
        clear();
        return;
      }

      clear();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/checkout/sucesso?order=${data.orderNumber}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (method === "credit_card" || method === "pagseguro_card") {
      setError("Preencha o cartão e use o botão de pagar do formulário.");
      return;
    }
    if (method === "pagseguro" && psType === "CREDIT_CARD") {
      setError("Preencha o cartão PagBank e use o botão Pagar.");
      return;
    }
    try {
      await placeOrder(
        method === "pagseguro"
          ? { pagseguroType: psType }
          : method === "pagseguro_pix"
            ? { pagseguroType: "PIX" }
            : method === "pagseguro_card"
              ? { pagseguroType: "CREDIT_CARD" }
              : undefined
      );
    } catch {
      /* error already set */
    }
  }

  async function onCardPay(data: {
    cardToken: string;
    paymentMethodId: string;
    installments: number;
    issuerId?: string;
  }) {
    await placeOrder({
      cardToken: data.cardToken,
      paymentMethodId: data.paymentMethodId,
      installments: data.installments,
      issuerId: data.issuerId,
    });
  }

  async function onPagBankCardPay(data: {
    encryptedCard: string;
    installments: number;
    holderName: string;
    holderTaxId: string;
  }) {
    await placeOrder({
      pagseguroType: "CREDIT_CARD",
      encryptedCard: data.encryptedCard,
      installments: data.installments,
      holderName: data.holderName,
      holderTaxId: data.holderTaxId,
    });
  }

  if (items.length === 0 && !preferenceId) return null;

  return (
    <div className="container-maj py-12">
      <h1
        className="text-4xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Checkout
      </h1>
      <p className="text-sm text-[#5c534c] mb-8">
        {isCustomer
          ? "Dados da sua conta preenchidos. Você pode editar antes de confirmar."
          : guestChosen
            ? "Compra como visitante — sem necessidade de cadastro."
            : "Escolha como prefere finalizar seu pedido."}
      </p>

      {showIdentityChoice ? (
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mb-10">
          <div className="border border-[#2a2420]/10 bg-white p-5 sm:p-6 flex flex-col">
            <span className="inline-flex h-10 w-10 items-center justify-center bg-[#f7f1ea] text-[#a85f64] mb-3">
              <LogIn size={18} strokeWidth={1.75} />
            </span>
            <h2 className="text-lg font-medium text-[#2a2420]">
              Já tenho cadastro
            </h2>
            <p className="mt-1.5 text-sm text-[#5c534c] leading-relaxed flex-1">
              Entre na sua conta para preencher dados e endereço
              automaticamente e acompanhar o pedido.
            </p>
            <Link
              href={loginHref}
              className="btn btn-primary w-full mt-5 text-center"
            >
              Entrar na conta
            </Link>
            <p className="mt-3 text-xs text-center text-[#8a7468]">
              Ainda não tem conta?{" "}
              <Link href={registerHref} className="text-[#a85f64] underline">
                Criar cadastro
              </Link>
            </p>
          </div>

          <div className="border border-[#2a2420]/10 bg-white p-5 sm:p-6 flex flex-col">
            <span className="inline-flex h-10 w-10 items-center justify-center bg-[#f7f1ea] text-[#a85f64] mb-3">
              <UserRound size={18} strokeWidth={1.75} />
            </span>
            <h2 className="text-lg font-medium text-[#2a2420]">
              Comprar sem cadastro
            </h2>
            <p className="mt-1.5 text-sm text-[#5c534c] leading-relaxed flex-1">
              Informe seus dados só para esta compra. Rápido e sem criar conta.
            </p>
            <button
              type="button"
              className="btn btn-outline w-full mt-5"
              onClick={() => setGuestChosen(true)}
            >
              Continuar como visitante
            </button>
          </div>
        </div>
      ) : null}

      {isCustomer || guestChosen ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          {isCustomer ? (
            <span className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-900 text-xs">
              Logada como {session?.user?.email || "cliente"}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 border border-[#e0d4c8] bg-[#faf7f3] px-3 py-1.5 text-[#5c534c] text-xs">
                Compra sem cadastro
              </span>
              <Link href={loginHref} className="text-xs text-[#a85f64] underline">
                Prefiro entrar na conta
              </Link>
            </>
          )}
        </div>
      ) : null}

      {showCheckoutForm ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-10 lg:grid-cols-[1fr_340px]"
        >
          <div className="space-y-6">
            <section className="border border-line bg-surface p-6 space-y-3">
              <h2 className="text-lg font-semibold mb-2">Seus dados</h2>
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                onBlur={onCpfBlur}
                placeholder="CPF (nota fiscal)"
                className="input"
                required
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nome completo"
                className="input"
              />
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  saveCheckoutContact(e.target.value, phone);
                }}
                type="email"
                required
                placeholder="E-mail"
                className="input"
              />
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  saveCheckoutContact(email, e.target.value);
                }}
                required
                placeholder="WhatsApp"
                className="input"
              />
            </section>

            <section className="border border-line bg-surface p-6 space-y-4">
              <h2 className="text-lg font-semibold">Entrega</h2>

              {isCustomer ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#8a7468]">
                    Escolha um endereço salvo ou cadastre outro para esta
                    entrega.
                  </p>
                  {savedAddresses.length > 0 ? (
                    <div className="space-y-2">
                      {savedAddresses.map((a) => (
                        <label
                          key={a.id}
                          className={`flex items-start gap-3 border p-3 cursor-pointer ${
                            addressMode === "saved" &&
                            selectedAddressId === a.id
                              ? "border-[#a85f64] bg-[#faf7f3]"
                              : "border-line"
                          }`}
                        >
                          <input
                            type="radio"
                            name="addressChoice"
                            className="mt-1"
                            checked={
                              addressMode === "saved" &&
                              selectedAddressId === a.id
                            }
                            onChange={() => applySavedAddress(a)}
                          />
                          <span className="text-sm min-w-0">
                            <span className="font-medium text-[#2a2420]">
                              {a.label}
                              {a.isDefault ? (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-[#a85f64]">
                                  Principal
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-[#5c534c] mt-0.5 leading-relaxed">
                              {a.street}, {a.number}
                              {a.complement ? ` — ${a.complement}` : ""}
                              <br />
                              {a.neighborhood} · {a.city}/{a.state} · CEP{" "}
                              {formatCep(a.zipCode)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  <label
                    className={`flex items-start gap-3 border p-3 cursor-pointer ${
                      addressMode === "new"
                        ? "border-[#a85f64] bg-[#faf7f3]"
                        : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressChoice"
                      className="mt-1"
                      checked={addressMode === "new"}
                      onChange={() => {
                        setAddressMode("new");
                        setSelectedAddressId("");
                        applyAddressFields({
                          ...emptyAddressFields(),
                          label: "Entrega",
                        });
                        setQuotes([]);
                        setShippingId("");
                      }}
                    />
                    <span className="text-sm">
                      <span className="font-medium text-[#2a2420]">
                        Entregar em outro endereço
                      </span>
                      <span className="block text-xs text-[#8a7468] mt-0.5">
                        Informe um CEP novo — buscamos o endereço
                        automaticamente.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              {(!isCustomer || addressMode === "new") && (
                <div className="space-y-3">
                  {!isCustomer ? (
                    <p className="text-xs text-[#8a7468]">
                      Digite o CEP para preencher o endereço automaticamente.
                      {shippingZip.replace(/\D/g, "").length === 8
                        ? " Já trouxemos o CEP da estimativa no produto."
                        : ""}
                    </p>
                  ) : null}
                  <AddressFields
                    value={deliveryFields}
                    onChange={(v) => {
                      applyAddressFields(v);
                      const digits = v.zip.replace(/\D/g, "");
                      if (digits.length === 8) {
                        quoteFreight(digits);
                      }
                    }}
                    showLabel={isCustomer}
                  />
                  {isCustomer ? (
                    <label className="flex items-center gap-2 text-sm text-[#5c534c]">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                      />
                      Salvar este endereço na minha conta
                    </label>
                  ) : null}
                </div>
              )}

              {isCustomer && addressMode === "saved" ? (
                <div className="text-sm text-[#5c534c] border border-[#e0d4c8] bg-[#faf7f3]/60 px-3 py-2.5">
                  Entrega em: {street}, {number}
                  {complement ? ` — ${complement}` : ""} · {neighborhood} ·{" "}
                  {city}/{stateUf} · CEP {zip}
                </div>
              ) : null}

              <button
                type="button"
                className="btn btn-outline w-full sm:w-auto"
                onClick={() => quoteFreight()}
              >
                Calcular frete
              </button>

              {quotes.length > 0 && (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-start justify-between gap-3 border p-3 cursor-pointer ${
                        shippingId === q.id
                          ? "border-[#a85f64] bg-[#faf7f3]"
                          : "border-line"
                      }`}
                    >
                      <span className="flex items-start gap-2 min-w-0">
                        <input
                          type="radio"
                          name="shipping"
                          className="mt-1"
                          checked={shippingId === q.id}
                          onChange={() => setShippingId(q.id)}
                        />
                        <span>
                          <span className="block text-sm font-medium">
                            {q.local
                              ? `${q.company}: ${q.name}`
                              : `${q.company} ${q.name}`}
                            {!q.local ? (
                              <span className="font-normal text-[#5c534c]">
                                {" "}
                                · {q.deliveryDays} dia(s)
                              </span>
                            ) : null}
                          </span>
                          {q.note ? (
                            <span className="block text-xs text-[#8a7468] mt-0.5">
                              {q.note}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <strong className="shrink-0 text-sm">
                        {q.local ? "A combinar" : formatBRL(q.price)}
                      </strong>
                    </label>
                  ))}
                </div>
              )}
              {selectedShipping?.local ? (
                <p className="text-xs text-[#5c534c] leading-relaxed">
                  Finalize o pagamento normalmente no site. Na tela de pedido
                  finalizado, use o botão do WhatsApp para combinar a entrega
                  em Planaltina ou Sobradinho.
                </p>
              ) : null}
            </section>

            <section className="border border-line bg-surface p-6 space-y-3">
              <h2 className="text-lg font-semibold mb-2">Pagamento</h2>
              {payMethods.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma forma de pagamento ativa no momento. Configure em
                  Admin → Pagamentos.
                </p>
              ) : (
                <CheckoutPaymentMethods
                  methods={payMethods}
                  method={method}
                  onMethodChange={(id) => {
                    setMethod(id);
                    setPreferenceId(null);
                    setError("");
                    setCardInstallments(1);
                  }}
                  amount={total}
                  publicKey={mpPublicKey}
                  pagseguroPublicKey={psPublicKey}
                  pagseguroType={psType}
                  onPagseguroTypeChange={(t) => {
                    setPsType(t);
                    setCardInstallments(1);
                  }}
                  preferenceId={preferenceId}
                  cardBusy={loading}
                  cardHolderName={name}
                  cardHolderTaxId={cpf}
                  onCardPay={onCardPay}
                  onPagBankCardPay={onPagBankCardPay}
                  onInstallmentsChange={setCardInstallments}
                />
              )}
            </section>
          </div>
          <aside className="border border-line bg-surface p-6 h-fit space-y-3">
            {items.map((i) => (
              <div
                key={i.variantId}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span className="min-w-0">
                  {i.productName} × {i.quantity}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="tabular-nums">
                    {formatBRL(i.price * i.quantity)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ${i.productName}`}
                    title="Remover"
                    className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink hover:bg-black/5 transition-colors"
                    onClick={() => removeItem(i.variantId)}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </span>
              </div>
            ))}
            <div className="border-t border-line pt-3 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatBRL(cartSub)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frete</span>
              <span>
                {selectedShipping?.local
                  ? "A combinar"
                  : formatBRL(shippingCost)}
              </span>
            </div>
            {siteDiscount > 0 && matchedPromo ? (
              <div className="flex justify-between text-sm text-[#5a7a4a]">
                <span>
                  {matchedPromo.label || `Promoção (−${matchedPromo.percent}%)`}
                  {matchedPromo.scope === "pix"
                    ? " · Pix"
                    : matchedPromo.scope === "card"
                      ? matchedPromo.cardInstallmentsMax === 1
                        ? " · cartão 1x"
                        : matchedPromo.cardInstallmentsMax
                          ? ` · cartão até ${matchedPromo.cardInstallmentsMax}x`
                          : " · cartão"
                      : isPixMethod
                        ? " · Pix incluso"
                        : matchedPromo.cardInstallmentsMax === 1
                          ? " · cartão 1x"
                          : ""}
                </span>
                <span>−{formatBRL(siteDiscount)}</span>
              </div>
            ) : null}
            {couponDiscount > 0 ? (
              <div className="flex justify-between text-sm text-[#5a7a4a]">
                <span>Desconto ({couponApplied?.code})</span>
                <span>−{formatBRL(couponDiscount)}</span>
              </div>
            ) : null}
            {pixDiscount > 0 ? (
              <div className="flex justify-between text-sm text-[#5a7a4a]">
                <span>Desconto Pix ({defaultPayment.pixDiscountPercent}%)</span>
                <span>−{formatBRL(pixDiscount)}</span>
              </div>
            ) : null}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) =>
                    setCouponInput(e.target.value.toUpperCase())
                  }
                  placeholder="Cupom"
                  className="input !py-2 text-sm"
                />
                <button
                  type="button"
                  className="btn btn-outline !py-2 !px-3 text-xs shrink-0"
                  onClick={applyCoupon}
                >
                  Aplicar
                </button>
              </div>
              {couponMsg ? (
                <p
                  className={`text-xs ${
                    couponApplied ? "text-[#5a7a4a]" : "text-rose-dark"
                  }`}
                >
                  {couponMsg}
                </p>
              ) : null}
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-line pt-3">
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
            {isCardMethod &&
            cardInstallments > 1 &&
            !matchedPromo &&
            Math.max(sitePromo.percent, sitePromo.card1xOfferPercent) > 0 ? (
              <p className="text-[11px] text-muted leading-relaxed">
                A promoção de{" "}
                {Math.max(sitePromo.percent, sitePromo.card1xOfferPercent)}% no
                cartão vale apenas em 1x. Em {cardInstallments}x o total da loja
                é {formatBRL(total)}. O PagBank pode somar juros no cartão da
                cliente (não entram no valor que a loja recebe).
              </p>
            ) : isCardMethod && cardInstallments > 1 ? (
              <p className="text-[11px] text-muted leading-relaxed">
                Total da loja {formatBRL(total)}. Em {cardInstallments}x o
                PagBank pode acrescentar juros no cartão (aparecem no extrato;
                a loja recebe este valor bruto).
              </p>
            ) : null}
            {error && <p className="text-sm text-rose-dark">{error}</p>}
            {method === "credit_card" ||
            method === "pagseguro_card" ||
            (method === "pagseguro" && psType === "CREDIT_CARD") ? (
              <p className="text-xs text-muted text-center">
                Use o botão de pagamento do formulário de cartão acima.
              </p>
            ) : preferenceId ? (
              <p className="text-xs text-[#5a7a4a] text-center">
                Pedido criado — finalize no botão Mercado Pago acima.
              </p>
            ) : (
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || !method || payMethods.length === 0}
              >
                {loading ? "Processando..." : "Finalizar pedido"}
              </button>
            )}
          </aside>
        </form>
      ) : showIdentityChoice ? (
        <aside className="max-w-3xl border border-line bg-surface p-5 space-y-2">
          <p className="text-sm font-medium text-[#2a2420]">Resumo do pedido</p>
          {items.map((i) => (
            <div
              key={i.variantId}
              className="flex items-start justify-between gap-2 text-sm text-[#5c534c]"
            >
              <span className="min-w-0">
                {i.productName} × {i.quantity}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums text-[#2a2420]">
                  {formatBRL(i.price * i.quantity)}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${i.productName}`}
                  title="Remover"
                  className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink hover:bg-black/5 transition-colors"
                  onClick={() => removeItem(i.variantId)}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold border-t border-line pt-2 text-[#2a2420]">
            <span>Subtotal</span>
            <span>{formatBRL(cartSub)}</span>
          </div>
        </aside>
      ) : (
        <p className="text-sm text-muted">Carregando…</p>
      )}
    </div>
  );
}
