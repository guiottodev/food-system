import type { ReactNode } from "react";
import styles from "./EmptyStateCompact.module.css";

export default function EmptyStateCompact({
  icon = "OK",
  children,
  className,
}: {
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.emptyState} ${className || ""}`.trim()}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}
