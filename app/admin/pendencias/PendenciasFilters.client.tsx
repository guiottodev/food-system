"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";

type PendingType =
  | "all"
  | "INCOMPLETE"
  | "ALTERADO_APOS_CONFIRMACAO"
  | "PRECISA_PRODUZIR";

const options: Array<{ value: PendingType; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "INCOMPLETE", label: "Incompletas" },
  { value: "ALTERADO_APOS_CONFIRMACAO", label: "Alteradas" },
  { value: "PRECISA_PRODUZIR", label: "Precisa produzir" },
];

function normalizeType(value: string | null, fallback: PendingType): PendingType {
  if (
    value === "INCOMPLETE" ||
    value === "ALTERADO_APOS_CONFIRMACAO" ||
    value === "PRECISA_PRODUZIR"
  ) {
    return value;
  }
  if (value === "all") return "all";
  return fallback;
}

export default function PendenciasFilters({ initialType }: { initialType: PendingType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentType = normalizeType(searchParams.get("type"), initialType);

  const applyType = useCallback(
    (nextType: PendingType) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextType === "all") {
        params.delete("type");
      } else {
        params.set("type", nextType);
      }
      const next = params.toString();
      startTransition(() => {
        router.push(next ? `${pathname}?${next}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  return (
    <div className={styles.clusterSm}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Tipo de pendencia</span>
        <select
          name="type"
          value={currentType}
          onChange={(event) => applyType(event.target.value as PendingType)}
          className={styles.control}
          disabled={isPending}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
