"use client";

import { useRouter } from "next/navigation";

type Props = {
  value: string; // YYYY-MM
  options: { value: string; label: string }[];
};

export function FinanceMonthFilter({ value, options }: Props) {
  const router = useRouter();

  return (
    <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-wider text-muted whitespace-nowrap">
        Filtrar mês
      </span>
      <select
        className="input !py-2 min-w-[12rem]"
        value={value}
        onChange={(e) => {
          const mes = e.target.value;
          router.push(`/admin/financeiro?mes=${encodeURIComponent(mes)}`);
        }}
        aria-label="Filtrar por mês"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
