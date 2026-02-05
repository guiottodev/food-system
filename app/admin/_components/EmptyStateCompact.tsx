import type { ReactNode } from "react";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import styles from "./EmptyStateCompact.module.css";

export default function EmptyStateCompact({
  icon: Icon = CheckCircle2,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.emptyState} ${className || ""}`.trim()}>
      <span className={styles.icon} aria-hidden>
        <Icon size={16} />
      </span>
      <span>{children}</span>
    </div>
  );
}
