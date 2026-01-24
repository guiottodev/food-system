"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./_styles/adminPrimitives.module.css";

function linkClass(isActive: boolean) {
  return `${styles.topNavLink}${isActive ? ` ${styles.topNavLinkActive}` : ""}`;
}

export default function AdminTopNav() {
  const pathname = usePathname() || "";
  const isOrdersNew = pathname.startsWith("/admin/orders/new");
  const isOrders =
    !isOrdersNew && (pathname === "/admin/orders" || pathname.startsWith("/admin/orders/"));
  const isClientes =
    pathname === "/admin/clientes" || pathname.startsWith("/admin/clientes/");
  const isProducao =
    pathname === "/admin/producao" || pathname.startsWith("/admin/producao/");
  const isProducaoHub =
    pathname === "/admin/capacidade" || pathname.startsWith("/admin/capacidade/");
  const isAdminHome = pathname === "/admin" || pathname === "/admin/";
  const isCategories =
    pathname === "/admin/categories" || pathname.startsWith("/admin/categories/");
  const isProducts =
    pathname === "/admin/products" || pathname.startsWith("/admin/products/");

  return (
    <nav className={styles.topNav}>
      <Link
        className={linkClass(isAdminHome)}
        href="/admin"
        aria-current={isAdminHome ? "page" : undefined}
      >
        Painel
      </Link>
      <Link
        className={linkClass(isOrders)}
        href="/admin/orders"
        aria-current={isOrders ? "page" : undefined}
      >
        Pedidos
      </Link>
      <Link
        className={linkClass(isClientes)}
        href="/admin/clientes"
        aria-current={isClientes ? "page" : undefined}
      >
        Clientes
      </Link>
      <Link
        className={linkClass(isProducaoHub)}
        href="/admin/capacidade"
        aria-current={isProducaoHub ? "page" : undefined}
      >
        Produção
      </Link>
      <Link
        className={linkClass(isProducao)}
        href="/admin/producao"
        aria-current={isProducao ? "page" : undefined}
      >
        Registrar produção
      </Link>
      <Link
        className={linkClass(isOrdersNew)}
        href="/admin/orders/new"
        aria-current={isOrdersNew ? "page" : undefined}
      >
        Novo pedido
      </Link>
      <Link
        className={linkClass(isCategories)}
        href="/admin/categories"
        aria-current={isCategories ? "page" : undefined}
      >
        Categorias
      </Link>
      <Link
        className={linkClass(isProducts)}
        href="/admin/products"
        aria-current={isProducts ? "page" : undefined}
      >
        Produtos
      </Link>
    </nav>
  );
}
