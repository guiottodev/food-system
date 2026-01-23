export type CategoryLike = {
  id: string;
  name: string;
  parentId?: string | null;
};

export function buildCategoryIndex(categories: CategoryLike[]) {
  const byId = new Map<string, CategoryLike>();
  for (const c of categories) byId.set(c.id, c);

  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    const key = c.parentId ?? "ROOT";
    const list = childrenByParent.get(key) ?? [];
    list.push(c.id);
    childrenByParent.set(key, list);
  }

  for (const [key, ids] of childrenByParent.entries()) {
    ids.sort((a, b) => (byId.get(a)?.name ?? "").localeCompare(byId.get(b)?.name ?? ""));
    childrenByParent.set(key, ids);
  }

  return { byId, childrenByParent };
}

export function buildCategoryPathLabel(
  byId: Map<string, CategoryLike>,
  id: string,
  separator = " › "
) {
  const names: string[] = [];
  let cur: string | null | undefined = id;
  while (cur) {
    const c = byId.get(cur);
    if (!c) break;
    names.push(c.name);
    cur = c.parentId ?? null;
  }
  return names.reverse().join(separator);
}

export function getDescendantCategoryIds(
  childrenByParent: Map<string, string[]>,
  rootId: string
) {
  const result: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    const children = childrenByParent.get(id);
    if (children?.length) stack.push(...children);
  }
  return result;
}

export function isLeafCategory(childrenByParent: Map<string, string[]>, id: string) {
  return (childrenByParent.get(id) ?? []).length === 0;
}

export function buildCategoryOptions(params: {
  categories: Array<{ id: string; name: string; parentId: string | null; isActive?: boolean }>;
  includeInactive?: boolean;
  leavesOnly?: boolean;
}) {
  const { byId, childrenByParent } = buildCategoryIndex(params.categories);
  const opts: Array<{ id: string; label: string; isLeaf: boolean; isActive: boolean }> = [];

  for (const c of params.categories) {
    const isActive = c.isActive ?? true;
    if (!params.includeInactive && !isActive) continue;
    const leaf = isLeafCategory(childrenByParent, c.id);
    if (params.leavesOnly && !leaf) continue;
    opts.push({
      id: c.id,
      label: buildCategoryPathLabel(byId, c.id),
      isLeaf: leaf,
      isActive,
    });
  }

  opts.sort((a, b) => a.label.localeCompare(b.label));
  return opts;
}

