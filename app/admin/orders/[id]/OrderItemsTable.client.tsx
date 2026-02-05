"use client";

import { Fragment, useState } from "react";
import detailStyles from "../orderDetail.module.css";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export type OrderItemRow = {
  id: string;
  productName: string | null;
  skuName: string;
  unitLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sizeText: string | null;
  flavorText: string | null;
  isFrozen: boolean;
  status: "OK" | "A produzir";
};

function formatMoney(value: number) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "R$ 0,00";
  return moneyFormatter.format(number);
}

function formatQuantity(value: number) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return quantityFormatter.format(number);
}

export default function OrderItemsTable({ items }: { items: OrderItemRow[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <div className={detailStyles.itemsTableWrap}>
      <table className={detailStyles.itemsTable}>
        <thead>
          <tr>
            <th>Produto</th>
            <th className={detailStyles.itemNumeric}>Qtd</th>
            <th className={detailStyles.itemNumeric}>Subtotal</th>
            <th>Situacao</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isOpen = Boolean(expanded[item.id]);
            const rowClass = `${detailStyles.itemsRow} ${
              index % 2 === 1 ? detailStyles.itemsRowEven : ""
            } ${isOpen ? detailStyles.itemsRowExpanded : ""}`.trim();
            const detailsId = `order-item-${item.id}`;
            return (
              <Fragment key={item.id}>
                <tr className={rowClass}>
                  <td>
                    <div className={detailStyles.itemProduct}>
                      <span className={detailStyles.itemProductTitle}>
                        {item.productName
                          ? `${item.productName} - ${item.skuName}`
                          : item.skuName}
                      </span>
                      <span className={detailStyles.itemProductMeta}>
                        {item.unitLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={detailStyles.detailsToggle}
                      aria-expanded={isOpen}
                      aria-controls={detailsId}
                      onClick={() => toggleItem(item.id)}
                    >
                      {isOpen ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>
                  </td>
                  <td className={detailStyles.itemNumeric}>
                    <span className={detailStyles.itemQtyValue}>
                      {formatQuantity(item.quantity)}
                    </span>
                    <span className={detailStyles.itemUnit}> {item.unitLabel}</span>
                  </td>
                  <td className={detailStyles.itemNumeric}>
                    {formatMoney(item.lineTotal)}
                  </td>
                  <td>
                    <span
                      className={`${detailStyles.statusChip} ${
                        item.status === "A produzir" ? detailStyles.statusChipWarn : ""
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
                {isOpen ? (
                  <tr className={detailStyles.itemDetailsRow}>
                    <td colSpan={4}>
                      <div
                        id={detailsId}
                        className={detailStyles.itemDetails}
                        role="region"
                        aria-label={`Detalhes do item ${item.skuName}`}
                      >
                        <div className={detailStyles.itemDetailsGrid}>
                          <div>
                            <div className={detailStyles.itemDetailLabel}>Preco unitario</div>
                            <div className={detailStyles.itemDetailValue}>
                              {formatMoney(item.unitPrice)}
                            </div>
                          </div>
                          <div>
                            <div className={detailStyles.itemDetailLabel}>Variacao</div>
                            <div className={detailStyles.itemDetailValue}>
                              {item.skuName}
                            </div>
                          </div>
                          <div>
                            <div className={detailStyles.itemDetailLabel}>Tamanho</div>
                            <div className={detailStyles.itemDetailValue}>
                              {item.sizeText || "-"}
                            </div>
                          </div>
                          <div>
                            <div className={detailStyles.itemDetailLabel}>Sabor</div>
                            <div className={detailStyles.itemDetailValue}>
                              {item.flavorText || "-"}
                            </div>
                          </div>
                          <div>
                            <div className={detailStyles.itemDetailLabel}>Congelado</div>
                            <div className={detailStyles.itemDetailValue}>
                              {item.isFrozen ? "Sim" : "Nao"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
