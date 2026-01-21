import Link from "next/link";
import detailStyles from "./customerDetail.module.css";

type TabId = "dados" | "pedidos";

type TabDefinition = {
  id: TabId;
  label: string;
};

const TABS: TabDefinition[] = [
  { id: "dados", label: "Dados" },
  { id: "pedidos", label: "Pedidos" },
];

export default function CustomerTabs({
  activeTab,
  customerId,
}: {
  activeTab: TabId;
  customerId: string;
}) {
  return (
    <div className={detailStyles.tabs}>
      <div className={detailStyles.tabList} role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/admin/clientes/${customerId}?tab=${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`${detailStyles.tabButton} ${
                isActive ? detailStyles.tabButtonActive : ""
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
