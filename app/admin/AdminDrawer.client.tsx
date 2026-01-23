"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navSections } from "./adminNav";
import AdminNavSection from "./AdminNavSection.client";
import AdminSidebarFooter from "./AdminSidebarFooter.client";
import styles from "./_styles/adminShell.module.css";
import navStyles from "./_styles/adminNav.module.css";

export default function AdminDrawer({
  logoutAction,
}: {
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.mobileHeader}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
      </button>
      <div className={styles.mobileHeaderTitle}>Painel</div>

      {open ? (
        <div className={styles.drawerOverlay} onClick={() => setOpen(false)}>
          <aside
            className={styles.drawerPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerTopRow}>
              <span className={styles.drawerTitle}>Menu</span>
              <button
                type="button"
                className={styles.drawerClose}
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className={navStyles.navSections}>
              {navSections.map((section) => (
                <AdminNavSection
                  key={section.title}
                  section={section}
                  collapsed={false}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
            <AdminSidebarFooter collapsed={false} logoutAction={logoutAction} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
