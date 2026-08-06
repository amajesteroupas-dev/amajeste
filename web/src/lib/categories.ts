export type CategoryLike = {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder?: number;
};

/** Opções planas com rótulo hierárquico para selects de admin. */
export function flattenCategoryOptions(categories: CategoryLike[]) {
  const sorted = [...categories].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.name.localeCompare(b.name, "pt-BR")
  );
  const roots = sorted.filter((c) => !c.parentId);
  const children = sorted.filter((c) => c.parentId);
  const used = new Set<string>();
  const out: { id: string; name: string; label: string }[] = [];

  for (const root of roots) {
    used.add(root.id);
    out.push({ id: root.id, name: root.name, label: root.name });
    for (const child of children.filter((c) => c.parentId === root.id)) {
      used.add(child.id);
      out.push({
        id: child.id,
        name: child.name,
        label: `${root.name} › ${child.name}`,
      });
    }
  }

  for (const c of sorted) {
    if (used.has(c.id)) continue;
    out.push({ id: c.id, name: c.name, label: c.name });
  }

  return out;
}
