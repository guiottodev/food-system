export type AuditLogLike = {
  action?: string | null;
  field?: string | null;
};

export type ChangeGroup = "items" | "schedule" | "total";

export type ChangeSummary = {
  groups: ChangeGroup[];
  labels: string[];
  overflow: number;
};

const ITEM_ACTIONS = new Set([
  "create_items",
  "update_items",
  "delete_items",
  "order_items_update",
]);

const GROUP_LABELS: Record<ChangeGroup, string> = {
  items: "Itens alterados",
  schedule: "Data/hora alterada",
  total: "Total alterado",
};

function getChangeGroup(log: AuditLogLike): ChangeGroup | null {
  if (log.field === "items" || (log.action && ITEM_ACTIONS.has(log.action))) {
    return "items";
  }
  if (log.field === "deliveryDatetime" || log.field === "deliveryTime") {
    return "schedule";
  }
  if (log.field === "total" || log.field === "subtotal" || log.field === "deliveryFee") {
    return "total";
  }
  return null;
}

export function summarizeRecentChanges(
  logs: AuditLogLike[],
  options?: { maxItems?: number }
): ChangeSummary {
  const maxItems = options?.maxItems ?? 3;
  const seen = new Set<ChangeGroup>();
  const groups: ChangeGroup[] = [];

  for (const log of logs) {
    const group = getChangeGroup(log);
    if (!group || seen.has(group)) continue;
    seen.add(group);
    groups.push(group);
  }

  const visibleGroups = groups.slice(0, maxItems);
  const overflow = groups.length > maxItems ? groups.length - maxItems : 0;

  return {
    groups: visibleGroups,
    labels: visibleGroups.map((group) => GROUP_LABELS[group]),
    overflow,
  };
}

export function shouldShowReconfirmBanner(params: {
  needsReconfirmation: boolean;
  status: string;
  summary: ChangeSummary;
}): boolean {
  if (!params.needsReconfirmation) return false;
  if (params.status === "ENTREGUE" || params.status === "CANCELADO") return false;
  return params.summary.groups.length > 0;
}
