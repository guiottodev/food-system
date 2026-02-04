"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { navSections } from "./adminNav";
import AdminNavSection from "./AdminNavSection.client";
import AdminSidebarFooter from "./AdminSidebarFooter.client";
import styles from "./_styles/adminShell.module.css";
import navStyles from "./_styles/adminNav.module.css";

const STORAGE_KEY = "adminSidebarCollapsed";

export default function AdminSidebar({
  logoutAction,
}: {
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : ""
      }`}
    >
      <div className={navStyles.navHeader}>
        <Link href="/admin" className={navStyles.brand}>
          {collapsed ? (
            <span className={navStyles.brandCompact}>S</span>
          ) : (
            "Sistema"
          )}
        </Link>
        <button
          type="button"
          className={navStyles.collapseButton}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <div className={navStyles.navSections}>
        {navSections.map((section) => (
          <AdminNavSection
            key={section.title}
            section={section}
            collapsed={collapsed}
          />
        ))}
      </div>

      <AdminSidebarFooter collapsed={collapsed} logoutAction={logoutAction} />
    </aside>
  );
}
