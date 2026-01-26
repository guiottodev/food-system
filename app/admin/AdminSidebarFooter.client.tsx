"use client";

import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import styles from "./_styles/adminNav.module.css";
import primitives from "./_styles/adminPrimitives.module.css";
import { primaryAction } from "./adminNav";
import Button from "./_components/Button";

export default function AdminSidebarFooter({
  collapsed,
  logoutAction,
}: {
  collapsed: boolean;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className={styles.navFooter}>
      <Button
        variant="primary"
        href={primaryAction.href}
        className={`${styles.ctaButton} ${collapsed ? styles.ctaButtonCollapsed : ""}`}
      >
        <Plus size={18} aria-hidden />
        <span className={styles.ctaLabel}>{primaryAction.label}</span>
      </Button>
      <form action={logoutAction} className={styles.logoutForm}>
        <Button
          type="submit"
          variant="secondary"
          className={`${styles.logoutButton} ${collapsed ? styles.logoutButtonCollapsed : ""}`}
        >
          <LogOut size={18} aria-hidden />
          <span className={styles.logoutLabel}>Sair</span>
        </Button>
      </form>
    </div>
  );
}
