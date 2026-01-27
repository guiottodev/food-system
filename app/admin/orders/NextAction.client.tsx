"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Circle } from "lucide-react";
import Button from "../_components/Button";
import OrderStatusStack from "./OrderStatusStack.client";
import type { OrderStatus } from "@prisma/client";
import type { AttentionReason, OrderAttentionSummary } from "@/lib/domain/attention";
import styles from "./NextAction.module.css";

export type ChecklistItemStatus = "complete" | "pending" | "warning" | "optional";

export interface ChecklistItem {
  label: string;
  status: ChecklistItemStatus;
}

export interface NextActionProps {
  checklist: ChecklistItem[];
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "secondary" | "outline" | "ghost";
  }>;
  nextAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  whenToShow: "always" | "incomplete" | "custom";
  whenNotToShow?: () => boolean;
  summary?: {
    subtotal: number;
    tax?: number;
    total: number;
  };
  status?: OrderStatus;
  attention?: OrderAttentionSummary;
  sticky?: boolean;
}

export default function NextAction({
  checklist,
  primaryAction,
  secondaryActions,
  nextAction,
  whenToShow,
  whenNotToShow,
  summary,
  status,
  attention,
  sticky = false,
}: NextActionProps) {
  const shouldShow = React.useMemo(() => {
    if (whenToShow === "always") return true;
    if (whenToShow === "incomplete") {
      return checklist.some((item) => item.status === "pending" || item.status === "warning");
    }
    if (whenToShow === "custom" && whenNotToShow) {
      return !whenNotToShow();
    }
    return true;
  }, [whenToShow, whenNotToShow, checklist]);

  if (!shouldShow) return null;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getChecklistIcon = (status: ChecklistItemStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 size={16} className={styles.checklistIconComplete} aria-hidden />;
      case "pending":
        return <XCircle size={16} className={styles.checklistIconPending} aria-hidden />;
      case "warning":
        return <AlertTriangle size={16} className={styles.checklistIconWarning} aria-hidden />;
      case "optional":
        return <Circle size={16} className={styles.checklistIconOptional} aria-hidden />;
    }
  };

  return (
    <div className={`${styles.nextAction} ${sticky ? styles.nextActionSticky : ""}`}>
      {summary ? (
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Subtotal</span>
            <span className={styles.summaryValue}>{formatCurrency(summary.subtotal)}</span>
          </div>
          {summary.tax !== undefined && summary.tax > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Taxa</span>
              <span className={styles.summaryValue}>{formatCurrency(summary.tax)}</span>
            </div>
          )}
          <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
            <span className={styles.summaryLabel}>Total</span>
            <span className={styles.summaryValue}>{formatCurrency(summary.total)}</span>
          </div>
        </div>
      ) : (
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={`${styles.summaryLabel} ${styles.summaryPlaceholder}`}>
              Resumo disponível após adicionar itens
            </span>
          </div>
        </div>
      )}

      {nextAction && (
        <div className={styles.nextActionSection}>
          {nextAction.href ? (
            <a
              href={nextAction.href}
              onClick={(e) => {
                e.preventDefault();
                const element = document.querySelector(nextAction.href!);
                if (element) {
                  const headerOffset = 80;
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                  });
                  // Foca o primeiro campo interativo da seção após scroll
                  setTimeout(() => {
                    const firstInput = element.querySelector("input, select, textarea") as HTMLElement;
                    if (firstInput) {
                      firstInput.focus();
                    }
                  }, 300);
                }
                if (nextAction.onClick) {
                  nextAction.onClick();
                }
              }}
              className={styles.nextActionLink}
            >
              → {nextAction.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={nextAction.onClick}
              className={styles.nextActionLink}
            >
              → {nextAction.label}
            </button>
          )}
        </div>
      )}

      <div className={styles.checklist}>
        <h3 className={styles.checklistTitle}>Checklist</h3>
        <ul className={styles.checklistList} role="list">
          {checklist.map((item, idx) => (
            <li key={idx} className={styles.checklistItem}>
              {getChecklistIcon(item.status)}
              <span className={styles[`checklistLabel${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`]}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {status && attention && (
        <div className={styles.statusSection}>
          <OrderStatusStack
            status={status}
            strongReasons={attention.strongReasons}
            weakReasons={attention.weakReasons}
            maxChips={2}
            overflowBehavior="+N"
          />
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className={styles.primaryActionButton}
        >
          {primaryAction.label}
        </Button>
        {secondaryActions && secondaryActions.length > 0 && (
          <div className={styles.secondaryActions}>
            {secondaryActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || "secondary"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
