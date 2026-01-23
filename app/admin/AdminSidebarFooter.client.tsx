"use client";

import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import styles from "./_styles/adminNav.module.css";
import primitives from "./_styles/adminPrimitives.module.css";
import { primaryAction } from "./adminNav";

export default function AdminSidebarFooter({
  collapsed,
  logoutAction,
}: {
  collapsed: boolean;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className={styles.navFooter}>
      <Link
        href={primaryAction.href}
        className={`${primitives.button} ${primitives.buttonPrimary} ${
          styles.ctaButton
        } ${collapsed ? styles.ctaButtonCollapsed : ""}`}
      >
        <Plus size={18} aria-hidden />
        <span className={styles.ctaLabel}>{primaryAction.label}</span>
      </Link>
      <form action={logoutAction} className={styles.logoutForm}>
        <button
          type="submit"
          className={`${primitives.button} ${primitives.buttonSecondary} ${
            styles.logoutButton
          } ${collapsed ? styles.logoutButtonCollapsed : ""}`}
        >
          <LogOut size={18} aria-hidden />
          <span className={styles.logoutLabel}>Sair</span>
        </button>
      </form>
    </div>
  );
}
