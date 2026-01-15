import Link from "next/link";
import detailStyles from "./productDetail.module.css";

type TabId = "details" | "skus" | "images";

type TabDefinition = {
  id: TabId;
  label: string;
};

const TABS: TabDefinition[] = [
  { id: "details", label: "Detalhes" },
  { id: "skus", label: "SKUs" },
  { id: "images", label: "Imagens" },
];

export default function ProductTabs({
  activeTab,
  productId,
}: {
  activeTab: TabId;
  productId: string;
}) {
  return (
    <div className={detailStyles.tabs}>
      <div className={detailStyles.tabList} role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/admin/products/${productId}?tab=${tab.id}`}
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
