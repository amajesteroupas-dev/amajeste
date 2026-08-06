"use client";

import { formatCep } from "@/lib/cep";

export type AddressFieldsValue = {
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  label?: string;
};

type Props = {
  value: AddressFieldsValue;
  onChange: (next: AddressFieldsValue) => void;
  /** Mostra campo apelido (Casa, Trabalho…) */
  showLabel?: boolean;
  /** Prefixo nos names dos inputs (formulários nativos) */
  namePrefix?: string;
  compact?: boolean;
};

export function AddressFields({
  value,
  onChange,
  showLabel = false,
  namePrefix = "",
  compact = false,
}: Props) {
  const p = namePrefix;

  async function lookupCep(raw?: string) {
    const digits = (raw ?? value.zip).replace(/\D/g, "");
    if (digits.length !== 8) return;
    const res = await fetch(`/api/cep/${digits}`);
    if (!res.ok) return;
    const data = await res.json();
    onChange({
      ...value,
      zip: formatCep(digits),
      street: data.street || value.street,
      neighborhood: data.neighborhood || value.neighborhood,
      city: data.city || value.city,
      state: data.state || value.state,
      complement: value.complement || data.complement || "",
    });
  }

  function set<K extends keyof AddressFieldsValue>(
    key: K,
    val: AddressFieldsValue[K]
  ) {
    onChange({ ...value, [key]: val });
  }

  const gap = compact ? "gap-2" : "gap-3";

  return (
    <div className={`space-y-3 ${gap}`}>
      {showLabel ? (
        <label className="block text-sm">
          Apelido do endereço
          <input
            name={`${p}label`}
            className="input mt-1"
            value={value.label || ""}
            onChange={(e) => set("label", e.target.value)}
            placeholder="Principal, Casa, Trabalho…"
          />
        </label>
      ) : null}

      <div className="flex gap-2">
        <label className="block text-sm flex-1">
          CEP
          <input
            name={`${p}zip`}
            className="input mt-1"
            value={value.zip}
            onChange={(e) => {
              const formatted = formatCep(e.target.value);
              set("zip", formatted);
              if (formatted.replace(/\D/g, "").length === 8) {
                lookupCep(formatted);
              }
            }}
            onBlur={() => lookupCep()}
            placeholder="00000-000"
            inputMode="numeric"
            required
            autoComplete="postal-code"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-outline !py-2.5 text-xs shrink-0"
            onClick={() => lookupCep()}
          >
            Buscar CEP
          </button>
        </div>
      </div>

      <label className="block text-sm">
        Rua
        <input
          name={`${p}street`}
          className="input mt-1"
          value={value.street}
          onChange={(e) => set("street", e.target.value)}
          required
          autoComplete="street-address"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Número
          <input
            name={`${p}number`}
            className="input mt-1"
            value={value.number}
            onChange={(e) => set("number", e.target.value)}
            required
            autoComplete="address-line2"
          />
        </label>
        <label className="block text-sm">
          Complemento
          <input
            name={`${p}complement`}
            className="input mt-1"
            value={value.complement}
            onChange={(e) => set("complement", e.target.value)}
            placeholder="Apto, bloco…"
          />
        </label>
      </div>

      <label className="block text-sm">
        Bairro
        <input
          name={`${p}neighborhood`}
          className="input mt-1"
          value={value.neighborhood}
          onChange={(e) => set("neighborhood", e.target.value)}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Cidade
          <input
            name={`${p}city`}
            className="input mt-1"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            required
            autoComplete="address-level2"
          />
        </label>
        <label className="block text-sm">
          UF
          <input
            name={`${p}state`}
            className="input mt-1"
            value={value.state}
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            required
            autoComplete="address-level1"
          />
        </label>
      </div>
    </div>
  );
}

export const emptyAddressFields = (): AddressFieldsValue => ({
  zip: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  label: "Principal",
});
