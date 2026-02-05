"use client";

import Button from "../../_components/Button";
import type { OrderDetailPrimaryCta } from "./orderDetailViewModel";
import styles from "../orderDetail.module.css";

const CTA_LINK_ACTIONS = new Set<OrderDetailPrimaryCta["actionId"]>([
  "complete",
  "review_changes",
]);

function buildPrimaryHref(
  primaryCta: OrderDetailPrimaryCta,
  editLink: string
): string | null {
  if (!CTA_LINK_ACTIONS.has(primaryCta.actionId)) return null;

  if (primaryCta.actionId === "complete") {
    return `${editLink}${primaryCta.anchorTarget ?? ""}`;
  }

  return primaryCta.anchorTarget ?? "#order-changes";
}

type OrderDetailPrimaryActionProps = {
  primaryCta: OrderDetailPrimaryCta;
  editLink: string;
  confirmFormId?: string;
  advanceFormId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showHelpText?: boolean;
};

export default function OrderDetailPrimaryAction({
  primaryCta,
  editLink,
  confirmFormId,
  advanceFormId,
  className,
  size = "lg",
  showHelpText = false,
}: OrderDetailPrimaryActionProps) {
  if (primaryCta.actionId === "none") {
    return (
      <div className={`${styles.primaryCtaFinal} ${className || ""}`.trim()}>
        {primaryCta.label}
      </div>
    );
  }

  const href = buildPrimaryHref(primaryCta, editLink);
  const formId =
    primaryCta.actionId === "confirm"
      ? confirmFormId
      : primaryCta.actionId === "advance_status"
      ? advanceFormId
      : undefined;

  const isDisabled = !primaryCta.enabled || (!href && !formId);

  return (
    <div className={`${styles.primaryCtaStack} ${className || ""}`.trim()}>
      <Button
        variant="primary"
        size={size}
        href={href ?? undefined}
        disabled={isDisabled}
        form={formId}
        type={formId ? "submit" : "button"}
        className={styles.primaryCtaButton}
      >
        {primaryCta.label}
      </Button>
      {showHelpText && primaryCta.helpText ? (
        <div className={styles.primaryCtaHelp}>{primaryCta.helpText}</div>
      ) : null}
    </div>
  );
}
