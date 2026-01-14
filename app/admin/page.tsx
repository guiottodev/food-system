import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";
import styles from "./_styles/adminPrimitives.module.css";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Painel</h1>
        <form action={logoutAction}>
          <button type="submit" className={styles.button}>
            Sair
          </button>
        </form>
      </div>
      <p>Bem-vindo ao sistema interno.</p>
      <div className={styles.stackSm}>
        <Link className={styles.panelLink} href="/admin/orders">
          Pedidos
        </Link>
        <Link className={styles.panelLink} href="/admin/catalog">
          Catalogo
        </Link>
      </div>
    </main>
  );
}
