import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";
import styles from "./_styles/adminPrimitives.module.css";
import AdminTopNav from "./AdminTopNav.client";

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
    <div className={styles.layoutRoot}>
      <div className={styles.topBar}>
        <header className={styles.pageHeader}>
          <AdminTopNav />
          <form className={styles.topNavRight} action={logoutAction}>
            <button type="submit" className={styles.button}>
              Sair
            </button>
          </form>
        </header>
      </div>
      {children}
    </div>
  );
}
