"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, NavItem } from "./adminNav";
import styles from "./_styles/adminNav.module.css";

export default function AdminNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "";
  const isActive = isNavItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`${styles.navItem} ${
        isActive ? styles.navItemActive : ""
      } ${collapsed ? styles.navItemCollapsed : ""}`}
      data-label={item.label}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={styles.navItemIcon} aria-hidden>
        <Icon size={18} />
      </span>
      <span className={styles.navItemLabel}>{item.label}</span>
    </Link>
  );
}
