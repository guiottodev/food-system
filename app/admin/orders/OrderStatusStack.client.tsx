"use client";

import React, { useState } from "react";
import { OrderStatus } from "@prisma/client";
import type { AttentionReason } from "@/lib/domain/attention";
import Chip from "../../_components/Chip";
import styles from "./OrderStatusStack.module.css";

export interface OrderStatusStackProps {
  status: OrderStatus;
  strongReasons: AttentionReason[];
  weakReasons: AttentionReason[];
  maxChips?: number;
  overflowBehavior?: "+N" | "tooltip" | "popover";
  density?: "comfortable" | "compact";
}

export default function OrderStatusStack({
  status,
  strongReasons,
  weakReasons,
  maxChips = 2,
  overflowBehavior = "+N",
  density = "comfortable",
}: OrderStatusStackProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = React.useRef<HTMLSpanElement>(null);

  const totalChips = strongReasons.length + weakReasons.length;
  const hasOverflow = totalChips > maxChips;

  const visibleStrong = strongReasons.slice(0, maxChips);
  const visibleWeak = weakReasons.slice(0, Math.max(0, maxChips - visibleStrong.length));
  const remainingStrong = strongReasons.slice(maxChips);
  const remainingWeak = weakReasons.slice(Math.max(0, maxChips - visibleStrong.length));

  const remainingLabels = [...remainingStrong, ...remainingWeak].map((r) => r.label);

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      RASCUNHO: "Rascunho",
      CONFIRMADO: "Confirmado",
      EM_PRODUCAO: "Em Produção",
      PRONTO: "Pronto",
      ENTREGUE: "Entregue",
      CANCELADO: "Cancelado",
    };
    return labels[status] || status;
  };

  return (
    <div className={styles.stack}>
      {/* Status sempre primeiro */}
      <Chip variant="status" status={status} label={getStatusLabel(status)} density={density} />

      {/* Pendências fortes */}
      {visibleStrong.map((reason, idx) => (
        <Chip
          key={`strong-${idx}`}
          variant="attention-strong"
          label={reason.label}
          density={density}
        />
      ))}

      {/* Alertas fracos */}
      {visibleWeak.map((reason, idx) => (
        <Chip
          key={`weak-${idx}`}
          variant="attention-weak"
          label={reason.label}
          density={density}
        />
      ))}

      {/* Overflow "+N" */}
      {hasOverflow && overflowBehavior === "+N" && (
        <span
          ref={tooltipRef}
          className={styles.overflowChip}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          tabIndex={0}
          role="button"
          aria-label={`Mais ${totalChips - maxChips} ${totalChips - maxChips === 1 ? "pendência" : "pendências"}`}
        >
          +{totalChips - maxChips}
          {showTooltip && (
            <span className={styles.tooltip} role="tooltip">
              {remainingLabels.join(", ")}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
