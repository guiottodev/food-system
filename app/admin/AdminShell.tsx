import AdminDrawer from "./AdminDrawer.client";
import AdminSidebar from "./AdminSidebar.client";
import styles from "./_styles/adminShell.module.css";

export default function AdminShell({
  children,
  logoutAction,
}: {
  children: React.ReactNode;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className={styles.shell}>
      <AdminSidebar logoutAction={logoutAction} />
      <div className={styles.shellMain}>
        <AdminDrawer logoutAction={logoutAction} />
        <div className={styles.shellContent}>{children}</div>
      </div>
    </div>
  );
}
