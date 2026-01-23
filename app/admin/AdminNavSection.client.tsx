"use client";

import { NavSection as NavSectionType } from "./adminNav";
import AdminNavItem from "./AdminNavItem.client";
import styles from "./_styles/adminNav.module.css";

export default function AdminNavSection({
  section,
  collapsed,
  onNavigate,
}: {
  section: NavSectionType;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={styles.navSection}>
      <div
        className={`${styles.navSectionTitle} ${
          collapsed ? styles.navSectionTitleCollapsed : ""
        }`}
      >
        {section.title}
      </div>
      <div className={styles.navSectionItems}>
        {section.items.map((item) => (
          <AdminNavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
