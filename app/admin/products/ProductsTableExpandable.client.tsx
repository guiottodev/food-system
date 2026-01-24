"use client";

import { useCallback, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductThumb from "./ProductThumb.client";
import { updateSkuPriceAction } from "./actions";
import layoutStyles from "./products.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type SkuRow = {
  id: string;
  isActive: boolean;
  displayName: string;
  sizeText: string;
  flavorText: string | null;
  isFrozen: boolean;
  unitType: string;
  unitLabel: string;
  priceCurrent: number;
  stockQuantity: number;
};

type ProductRow = {
  id: string;
  name: string;
  imageMainUrl: string | null;
  isActive: boolean;
  categoryLabel: string;
  skus: SkuRow[];
};

type ProductsTableExpandableProps = {
  products: ProductRow[];
};

function formatPrice(n: number): string {
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function formatAvailable(sku: SkuRow): string {
  const qty = sku.stockQuantity;
  if (sku.unitType === "KG") {
    return qty.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + sku.unitLabel;
  }
  return Math.round(qty) + " " + sku.unitLabel;
}

function skuSubline(sku: SkuRow): string {
  const parts = [sku.sizeText, sku.flavorText || null, sku.isFrozen ? "Congelado" : null].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "—";
}

export default function ProductsTableExpandable({ products }: ProductsTableExpandableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [editingPriceSkuId, setEditingPriceSkuId] = useState<string | null>(null);
  const [skusPriceCache, setSkusPriceCache] = useState<Record<string, number>>({});
  const [priceError, setPriceError] = useState<{ skuId: string; message: string } | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  const toggleExpand = useCallback((productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const handlePriceBlur = useCallback(
    async (sku: SkuRow, productId: string) => {
      if (editingPriceSkuId !== sku.id) return;
      const raw = priceInputRef.current?.value ?? "";
      const parsed = Number(String(raw).trim().replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        setPriceError({ skuId: sku.id, message: "Preço inválido" });
        return;
      }
      setPriceError(null);
      const res = await updateSkuPriceAction(sku.id, parsed);
      if (res.ok) {
        setSkusPriceCache((c) => ({ ...c, [sku.id]: parsed }));
        setEditingPriceSkuId(null);
      } else {
        setPriceError({ skuId: sku.id, message: res.error });
        setEditingPriceSkuId(null);
      }
    },
    [editingPriceSkuId]
  );

  const handlePriceKeyDown = useCallback(
    (e: React.KeyboardEvent, sku: SkuRow, productId: string) => {
      if (e.key === "Escape") {
        setEditingPriceSkuId(null);
        setPriceError(null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handlePriceBlur(sku, productId);
      }
    },
    [handlePriceBlur]
  );

  return (
    <div className={layoutStyles.tableContainer}>
      <table className={layoutStyles.productsTable}>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th className={layoutStyles.colNumeric}>SKUs / Un.</th>
            <th className={layoutStyles.colDisponivel}>Disponível</th>
            <th className={layoutStyles.colPreco}>Preço</th>
            <th className={layoutStyles.colActions}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const expanded = expandedIds.has(product.id);
            const activeSkus = product.skus.filter((s) => s.isActive).length;
            const totalSkusProduct = product.skus.length;
            const disponivelX = product.skus.filter((s) => (s.stockQuantity ?? 0) > 0).length;
            const disponivelY = product.skus.length;

            return (
              <Fragment key={product.id}>
                <tr className={layoutStyles.tableRow}>
                  <td>
                    <div className={layoutStyles.productCell}>
                      <button
                        type="button"
                        className={layoutStyles.expandBtn}
                        onClick={() => toggleExpand(product.id)}
                        aria-expanded={expanded}
                        aria-label={expanded ? "Recolher" : "Expandir"}
                      >
                        <ChevronRight
                          size={18}
                          strokeWidth={2.5}
                          className={`${layoutStyles.expandChevron} ${expanded ? layoutStyles.expandChevronExpanded : ""}`}
                          aria-hidden
                        />
                      </button>
                      <ProductThumb imageMainUrl={product.imageMainUrl} name={product.name} />
                      <div className={layoutStyles.productCellContent}>
                        <Link href={`/admin/products/${product.id}`} className={layoutStyles.productNameLink}>
                          {product.name}
                        </Link>
                        <span
                          className={`${layoutStyles.statusBadge} ${
                            product.isActive ? layoutStyles.statusActive : layoutStyles.statusInactive
                          }`}
                        >
                          {product.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={layoutStyles.categoryName}>{product.categoryLabel}</span>
                  </td>
                  <td className={layoutStyles.colNumeric}>
                    <div className={layoutStyles.skuInfo}>
                      <span className={layoutStyles.skuCount}>
                        {activeSkus} / {totalSkusProduct}
                      </span>
                      {activeSkus === 0 && (
                        <span className={layoutStyles.skuWarning}>Sem SKU ativo</span>
                      )}
                    </div>
                  </td>
                  <td className={layoutStyles.colDisponivel}>
                    {product.skus.length === 0 ? "—" : `${disponivelX} de ${disponivelY} disponíveis`}
                  </td>
                  <td className={layoutStyles.colPreco}>—</td>
                  <td className={layoutStyles.colActions}>
                    <span className={layoutStyles.actionLinksWrap}>
                      <Link href={`/admin/products/${product.id}`} className={layoutStyles.actionLink}>
                        Ver
                        <ChevronRight size={16} strokeWidth={2.5} aria-hidden />
                      </Link>
                      <Link
                        href={`/admin/capacidade?q=${encodeURIComponent(product.name)}`}
                        className={layoutStyles.actionLink}
                      >
                        Produção
                      </Link>
                    </span>
                  </td>
                </tr>

                {expanded &&
                  (product.skus.length === 0 ? (
                    <tr key={`${product.id}-empty`} className={layoutStyles.tableRowChild}>
                      <td colSpan={6} className={layoutStyles.emptySkus}>
                        Nenhum SKU cadastrado.{" "}
                        <Link href={`/admin/products/${product.id}?tab=skus`}>Adicionar SKU</Link>
                      </td>
                    </tr>
                  ) : (
                    product.skus.map((sku) => {
                      const isEditing = editingPriceSkuId === sku.id;
                      const displayPrice = skusPriceCache[sku.id] ?? sku.priceCurrent;
                      const err = priceError?.skuId === sku.id ? priceError : null;

                      return (
                        <tr key={sku.id} className={layoutStyles.tableRowChild}>
                          <td>
                            <div className={layoutStyles.skuCellIndent}>
                              <strong>{sku.displayName}</strong>
                              <div className={layoutStyles.skuSubline}>{skuSubline(sku)}</div>
                              {!sku.isActive && (
                                <span className={`${layoutStyles.statusBadge} ${layoutStyles.statusInactive}`}>
                                  Inativo
                                </span>
                              )}
                            </div>
                          </td>
                          <td>—</td>
                          <td className={layoutStyles.colNumeric}>{sku.unitLabel}</td>
                          <td
                            className={`${layoutStyles.colDisponivel} ${sku.stockQuantity === 0 ? layoutStyles.stockZero : ""}`}
                          >
                            {formatAvailable(sku)}
                          </td>
                          <td className={layoutStyles.colPreco}>
                            <div className={layoutStyles.priceCell}>
                              {isEditing ? (
                                <>
                                  <input
                                    ref={priceInputRef}
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    defaultValue={displayPrice}
                                    onBlur={() => handlePriceBlur(sku, product.id)}
                                    onKeyDown={(e) => handlePriceKeyDown(e, sku, product.id)}
                                    aria-label={`Editar preço de ${sku.displayName}`}
                                    className={layoutStyles.priceInput}
                                    autoFocus
                                  />
                                  {err && <div className={layoutStyles.priceError}>{err.message}</div>}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className={layoutStyles.priceDisplay}
                                  onClick={() => {
                                    setEditingPriceSkuId(sku.id);
                                    setPriceError(null);
                                  }}
                                >
                                  {formatPrice(displayPrice)}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={layoutStyles.colActions}>
                            <Link
                              href={`/admin/products/${product.id}?tab=skus&skuMode=edit&skuId=${sku.id}`}
                              className={layoutStyles.actionLink}
                            >
                              Editar
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
