"use client";

import { useRouter } from "next/navigation";

export function ComplaintStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();

  async function update(next: string) {
    await fetch(`/api/admin/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  return (
    <select
      className="input !py-1 !text-xs"
      defaultValue={status}
      onChange={(e) => update(e.target.value)}
    >
      <option value="OPEN">OPEN</option>
      <option value="IN_PROGRESS">IN_PROGRESS</option>
      <option value="RESOLVED">RESOLVED</option>
      <option value="REJECTED">REJECTED</option>
    </select>
  );
}
