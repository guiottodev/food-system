"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info, Link2, ListChecks, Receipt, Zap, type LucideIcon } from "lucide-react";
import Chip from "../../_components/Chip";
import type { OrderStatus } from "@prisma/client";
import type { OrderDetailViewModel, OrderDetailChecklistItem, OrderDetailBlockedReason } from "./orderDetailViewModel";
import OrderDetailPrimaryAction from "./OrderDetailPrimaryAction.client";
import styles from "../orderDetail.module.css";

const checklistStatusClass: Record<OrderDetailChecklistItem["status"], string> = {
  OK: styles.checklistStatusOk,
  WARN: styles.checklistStatusWarn,
  BLOCK: styles.checklistStatusBlock,
};

const blockedReasonContext: Record<NonNullable<OrderDetailBlockedReason["context"]>, string> = {
  edit: "edit",
  page: "page",
};

type OrderDetailSidebarProps = {
  viewModel: OrderDetailViewModel;
  editLink: string;
  context: Array<{ label: string; value: string; anchorTarget?: string }>;
  summary: {
    subtotal: number;
    deliveryFee?: number | null;
    total: number;
  };
  status: OrderStatus;
  statusLabel: string;
  showProduction: boolean;
  confirmFormId: string;
  advanceFormId: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function resolveReasonHref(reason: OrderDetailBlockedReason, editLink: string) {
  if (reason.context && blockedReasonContext[reason.context] === "edit") {
    return `${editLink}${reason.anchorTarget ?? ""}`;
  }
  return reason.anchorTarget ?? null;
}

export default function OrderDetailSidebar({
  viewModel,
  editLink,
  context,
  summary,
  status,
  statusLabel,
  showProduction,
  confirmFormId,
  advanceFormId,
}: OrderDetailSidebarProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const anchors = useMemo(
    () =>
      [
        showProduction ? { id: "order-production", label: "Producao" } : null,
        { id: "order-items", label: "Itens" },
        { id: "order-pending", label: "Pendencias" },
        { id: "order-audit", label: "Auditoria" },
      ].filter(Boolean) as Array<{ id: string; label: string }>,
    [showProduction]
  );

  const blockedReasons = viewModel.primaryCta.blockedReasons;
  const renderSectionHeader = (Icon: LucideIcon, title: string) => (
    <div className={styles.sidebarSectionHeader}>
      <Icon size={16} className={styles.sidebarTitleIcon} aria-hidden />
      <span className={styles.sidebarTitle}>{title}</span>
    </div>
  );

  const renderBlockedReasons = () => {
    if (!blockedReasons.length) return null;

    return (
      <section className={styles.sidebarSection}>
        {renderSectionHeader(AlertTriangle, "Por que nao da?")}
        <ul className={styles.blockedList}>
          {blockedReasons.map((reason, index) => {
            const href = resolveReasonHref(reason, editLink);
            return (
              <li key={`${reason.label}-${index}`} className={styles.blockedItem}>
                <span>{reason.label}</span>
                {href ? (
                  <a href={href} className={styles.actionLink}>
                    Resolver
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  const transitionChecklist = viewModel.checklist.filter((item) =>
    ["production", "reconfirmation"].includes(item.id)
  );

  const renderChecklist = () => (
    <section className={styles.sidebarSection}>
      {renderSectionHeader(ListChecks, "Checklist de transicao")}
      {transitionChecklist.length === 0 ? (
        <span className={styles.sidebarEmpty}>Sem pendencias de transicao.</span>
      ) : (
        <ul className={styles.sidebarChecklist}>
          {transitionChecklist.map((item) => {
            const className = checklistStatusClass[item.status];
            return (
              <li key={item.id} className={styles.sidebarChecklistItem}>
                <span
                  className={`${styles.checklistStatus} ${className}`.trim()}
                  aria-hidden
                />
                {item.anchorTarget ? (
                  <a href={item.anchorTarget} className={styles.checklistLink}>
                    {item.label}
                  </a>
                ) : (
                  <span className={styles.checklistLabel}>{item.label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const renderContext = () => (
    <section className={styles.sidebarSection}>
      {renderSectionHeader(Info, "Contexto do pedido")}
      <div className={styles.sidebarContext}>
        {context.map((item) => (
          <div key={item.label} className={styles.sidebarContextRow}>
            <span className={styles.sidebarContextLabel}>{item.label}</span>
            {item.anchorTarget ? (
              <a href={item.anchorTarget} className={styles.sidebarContextValue}>
                {item.value}
              </a>
            ) : (
              <span className={styles.sidebarContextValue}>{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const renderSummary = () => (
    <section className={styles.sidebarSection}>
      {renderSectionHeader(Receipt, "Resumo")}
      <div className={styles.sidebarSummary}>
        <div className={styles.sidebarSummaryRow}>
          <span>Subtotal</span>
          <span>{formatMoney(summary.subtotal)}</span>
        </div>
        {summary.deliveryFee && summary.deliveryFee > 0 ? (
          <div className={styles.sidebarSummaryRow}>
            <span>Taxa</span>
            <span>{formatMoney(summary.deliveryFee)}</span>
          </div>
        ) : null}
        <div className={styles.sidebarSummaryRowTotal}>
          <span>Total</span>
          <span>{formatMoney(summary.total)}</span>
        </div>
      </div>
    </section>
  );

  const renderAnchors = () => (
    <section className={styles.sidebarSection}>
      {renderSectionHeader(Link2, "Ancoras")}
      <div className={styles.anchorList}>
        {anchors.map((anchor) => (
          <a key={anchor.id} href={`#${anchor.id}`} className={styles.anchorLink}>
            {anchor.label}
          </a>
        ))}
      </div>
    </section>
  );

  const renderPanelContent = (includeCta: boolean) => (
    <div className={styles.sidebarPanel}>
      {includeCta ? (
        <section className={styles.sidebarSection}>
          {renderSectionHeader(Zap, "Proxima acao")}
          <OrderDetailPrimaryAction
            primaryCta={viewModel.primaryCta}
            editLink={editLink}
            confirmFormId={confirmFormId}
            advanceFormId={advanceFormId}
            showHelpText
          />
        </section>
      ) : null}
      {renderBlockedReasons()}
      {renderChecklist()}
      {renderContext()}
      {renderSummary()}
      {renderAnchors()}
    </div>
  );

  return (
    <>
      <div className={styles.sidebarContainer}>{renderPanelContent(true)}</div>

      <div className={styles.mobileActionBar}>
        <div className={styles.mobileActionBarContent}>
          <Chip
            variant="status"
            status={status}
            label={statusLabel}
            density="compact"
          />
          <div className={styles.mobileActionCta}>
            <OrderDetailPrimaryAction
              primaryCta={viewModel.primaryCta}
              editLink={editLink}
              confirmFormId={confirmFormId}
              advanceFormId={advanceFormId}
              size="md"
            />
          </div>
          <button
            type="button"
            className={styles.mobilePanelButton}
            onClick={() => setPanelOpen(true)}
            aria-haspopup="dialog"
            aria-controls="order-detail-panel"
            aria-expanded={panelOpen}
          >
            Painel
          </button>
        </div>
      </div>

      {panelOpen ? (
        <>
          <div
            className={styles.mobileSheetOverlay}
            onClick={() => setPanelOpen(false)}
            aria-hidden
          />
          <div
            id="order-detail-panel"
            className={styles.mobileSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-panel-title"
          >
            <div className={styles.mobileSheetHeader}>
              <div>
                <div id="order-detail-panel-title" className={styles.mobileSheetTitle}>
                  Painel do pedido
                </div>
                <div className={styles.mobileSheetSubtitle}>Checklist e resumo</div>
              </div>
              <button
                type="button"
                className={styles.mobileSheetClose}
                onClick={() => setPanelOpen(false)}
                aria-label="Fechar painel"
              >
                Fechar
              </button>
            </div>
            <div className={styles.mobileSheetBody}>{renderPanelContent(false)}</div>
          </div>
        </>
      ) : null}
    </>
  );
}
