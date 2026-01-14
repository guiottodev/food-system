import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";
import styles from "./_styles/adminPrimitives.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }

  return (
    <div className={styles.stackMd}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <nav className={styles.topNav}>
            <Link className={styles.topNavLink} href="/admin">
              Painel
            </Link>
            <Link className={styles.topNavLink} href="/admin/orders">
              Pedidos
            </Link>
            <Link className={styles.topNavLink} href="/admin/orders/new">
              Novo pedido
            </Link>
            <Link className={styles.topNavLink} href="/admin/catalog">
              Catalogo
            </Link>
            <Link className={styles.topNavLink} href="/admin/categories">
              Categorias
            </Link>
            <Link className={styles.topNavLink} href="/admin/products">
              Produtos
            </Link>
          </nav>
          <form className={styles.topNavRight} action={logoutAction}>
            <button type="submit">Sair</button>
          </form>
        </header>
      </div>
      {children}
    </div>
  );
}
