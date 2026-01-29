"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreVertical, Pencil } from "lucide-react";
import DataTable from "../_components/DataTable";
import ProductThumb from "./ProductThumb.client";
import ToneChip from "../_components/ToneChip";
import {
  deleteProductAction,
  duplicateProductAction,
  toggleProductAction,
  updateSkuPriceAction,
} from "./actions";
import layoutStyles from "./products.module.css";
import primitivesStyles from "../_styles/adminPrimitives.module.css";

type SortKey = "name" | "category";
type SortDir = "asc" | "desc";

type SkuAttribute = {
  key: string;
  value: string;
};

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
  attributes: SkuAttribute[];
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
  sort?: SortKey;
  dir?: SortDir;
};

function formatPrice(n: number): string {
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function formatPriceInput(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const num = Number(numbers) / 100;
  return num.toFixed(2).replace(".", ",");
}

function parsePriceInput(value: string): number {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return 0;
  return Number(numbers) / 100;
}

function formatAvailable(sku: SkuRow): string {
  const qty = sku.stockQuantity;
  if (sku.unitType === "KG") {
    return qty.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + sku.unitLabel;
  }
  return Math.round(qty) + " " + sku.unitLabel;
}

function skuSubline(sku: SkuRow): string {
  const parts = [sku.sizeText, sku.flavorText || null].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "";
}

export default function ProductsTableExpandable({ products, sort = "name", dir = "asc" }: ProductsTableExpandableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editingPriceSkuId, setEditingPriceSkuId] = useState<string | null>(null);
  const [savingPriceSkuId, setSavingPriceSkuId] = useState<string | null>(null);
  const [skusPriceCache, setSkusPriceCache] = useState<Record<string, number>>({});
  const [priceError, setPriceError] = useState<{ skuId: string; message: string } | null>(null);
  const [openMenuProductId, setOpenMenuProductId] = useState<string | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuProductId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuProductId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuProductId]);

  const handleSort = useCallback(
    (column: string, direction: "asc" | "desc") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", column);
      params.set("dir", direction);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    if (priceInputRef.current) {
      priceInputRef.current.value = formatted;
      const newSize = Math.max(5, Math.min(12, formatted.length + 1));
      priceInputRef.current.size = newSize;
    }
  }, []);

  const handlePriceBlur = useCallback(
    async (sku: SkuRow, productId: string) => {
      if (editingPriceSkuId !== sku.id) return;
      const raw = priceInputRef.current?.value ?? "";
      const parsed = parsePriceInput(raw);
      if (parsed <= 0) {
        setPriceError({ skuId: sku.id, message: "Preço inválido" });
        return;
      }
      setPriceError(null);
      setSavingPriceSkuId(sku.id);
      const res = await updateSkuPriceAction(sku.id, parsed);
      if (res.ok) {
        setSkusPriceCache((c) => ({ ...c, [sku.id]: parsed }));
        setEditingPriceSkuId(null);
      } else {
        setPriceError({ skuId: sku.id, message: res.error });
        setEditingPriceSkuId(null);
      }
      setSavingPriceSkuId(null);
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

  // Gerar expandStateKey baseado em filtros (reseta expands quando filtros mudam)
  const expandStateKey = useMemo(() => {
    return JSON.stringify({
      q: searchParams.get("q") ?? "",
      active: searchParams.get("active") ?? "",
      stock: searchParams.get("stock") ?? "",
      categoryId: searchParams.get("categoryId") ?? "",
      semSkuAtivo: searchParams.get("semSkuAtivo") ?? "",
    });
  }, [searchParams]);

  const columns = [
    {
      key: "product",
      header: "Produto",
      accessor: (row: ProductRow): React.ReactNode => (
        <div className={layoutStyles.productCell}>
          <ProductThumb imageMainUrl={row.imageMainUrl} name={row.name} />
          <div className={layoutStyles.productCellContent}>
            <span className={`${layoutStyles.productName} ${layoutStyles.productNameClamp}`}>{row.name}</span>
            <ToneChip
              tone={row.isActive ? "success" : "warning"}
              label={row.isActive ? "Ativo" : "Inativo"}
              density="comfortable"
            />
          </div>
        </div>
      ),
      sortable: true,
      visible: true,
      mobilePriority: "high" as const,
    },
    {
      key: "category",
      header: "Categoria",
      accessor: (row: ProductRow): React.ReactNode => (
        <span className={layoutStyles.categoryName}>{row.categoryLabel}</span>
      ),
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
    },
    {
      key: "skus",
      header: "SKUs / Un.",
      accessor: (row: ProductRow): React.ReactNode => {
        const activeSkus = row.skus.filter((s) => s.isActive).length;
        const totalSkusProduct = row.skus.length;
        return (
          <div
            className={layoutStyles.skuInfo}
            title={`${activeSkus} ativos / ${totalSkusProduct} totais`}
          >
            <span className={layoutStyles.skuCount}>
              {activeSkus} / {totalSkusProduct}
            </span>
            {activeSkus === 0 && (
              <ToneChip tone="neutral" label="Sem SKU ativo" density="compact" />
            )}
          </div>
        );
      },
      sortable: false,
      visible: true,
      mobilePriority: "low" as const,
    },
    {
      key: "available",
      header: "Disponível",
      accessor: (row: ProductRow): React.ReactNode => {
        const activeSkus = row.skus.filter((s) => s.isActive).length;
        const disponivelX = row.skus.filter((s) => s.isActive && (s.stockQuantity ?? 0) > 0).length;
        const disponivelY = activeSkus;
        
        if (row.skus.length === 0 || activeSkus === 0) {
          return (
            <div className={layoutStyles.availableCell}>
              <ToneChip tone="neutral" label="Sem SKU ativo" density="compact" />
            </div>
          );
        }
        
        if (disponivelX === 0) {
          return (
            <div className={layoutStyles.availableCell}>
              <Link
                href={`/admin/capacidade?q=${encodeURIComponent(row.name)}`}
                className={layoutStyles.actionLink}
                title="Ver produção"
                onClick={(e) => e.stopPropagation()}
              >
                <ToneChip tone="warning" label="Fora de estoque" density="compact" />
              </Link>
            </div>
          );
        }
        
        return (
          <div className={layoutStyles.availableCell}>
            <Link
              href={`/admin/capacidade?q=${encodeURIComponent(row.name)}`}
              className={layoutStyles.actionLink}
              title="Ver produção"
              onClick={(e) => e.stopPropagation()}
            >
              {disponivelX} de {disponivelY} disponíveis
            </Link>
          </div>
        );
      },
      sortable: false,
      visible: true,
      mobilePriority: "high" as const,
    },
    {
      key: "price",
      header: "Preço",
      accessor: (row: ProductRow): React.ReactNode => {
        const activeWithPrice = row.skus.filter((s) => s.isActive && typeof s.priceCurrent === "number");
        const minPrice = activeWithPrice.length ? Math.min(...activeWithPrice.map((s) => s.priceCurrent)) : null;
        return (
          <span title={minPrice != null ? "Menor preço entre SKUs ativos" : "Apenas SKUs inativos ou sem preço"}>
            {minPrice != null ? formatPrice(minPrice) : "Variável"}
          </span>
        );
      },
      sortable: false,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
  ];

  return (
    <div className={layoutStyles.tableWrapper}>
      <DataTable
        columns={columns}
        data={products}
        rowHref={(row: ProductRow) => `/admin/products/${row.id}`}
        rowAriaLabel={(row: ProductRow) => `Ver detalhes de ${row.name}`}
        expandStateKey={expandStateKey}
        density="comfortable"
        expandRenderer={(row: ProductRow) => {
          if (row.skus.length === 0) {
            return (
              <div className={layoutStyles.emptySkus}>
                Nenhum SKU cadastrado.{" "}
                <Link href={`/admin/products/${row.id}?tab=skus`} onClick={(e) => e.stopPropagation()}>
                  Adicionar SKU
                </Link>
              </div>
            );
          }

          return (
            <div className={layoutStyles.skusList}>
              {row.skus.map((sku) => {
                const isEditing = editingPriceSkuId === sku.id;
                const isSaving = savingPriceSkuId === sku.id;
                const displayPrice = skusPriceCache[sku.id] ?? sku.priceCurrent;
                const err = priceError?.skuId === sku.id ? priceError : null;
                const initialFormattedValue = formatPriceInput(String(Math.round(displayPrice * 100)).padStart(3, "0"));
                const inputSize = Math.max(5, Math.min(12, initialFormattedValue.length + 1));

                return (
                  <div key={sku.id} className={layoutStyles.skuRow}>
                    <div className={layoutStyles.skuHeader}>
                      <div className={layoutStyles.skuNameSection}>
                        <strong className={layoutStyles.skuName}>{sku.displayName}</strong>
                        {skuSubline(sku) ? (
                          <span className={layoutStyles.skuSubline}>{skuSubline(sku)}</span>
                        ) : null}
                        {sku.attributes.length > 0 && (
                          <div className={layoutStyles.skuAttributes}>
                            {sku.attributes.map((attr, index) => (
                              <span
                                key={`${sku.id}-attr-${index}`}
                                className={`${primitivesStyles.badge} ${primitivesStyles.badgeNeutral}`}
                                title={`${attr.key}: ${attr.value}`}
                              >
                                {attr.key}: {attr.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!sku.isActive && (
                        <div className={layoutStyles.skuHeaderChips}>
                          <ToneChip tone="warning" label="Inativo" density="compact" />
                        </div>
                      )}
                    </div>
                    <div className={layoutStyles.skuMeta}>
                      <div className={layoutStyles.skuMetaData}>
                        <div className={layoutStyles.skuMetaItem}>
                          <span className={layoutStyles.skuMetaLabel}>Disponível:</span>
                          <Link
                            href={`/admin/capacidade?q=${encodeURIComponent(row.name)}`}
                            className={`${layoutStyles.skuMetaValue} ${layoutStyles.skuDisponivelLink} ${sku.stockQuantity === 0 ? layoutStyles.stockZero : ""}`}
                            title="Ver produção"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatAvailable(sku)}
                          </Link>
                        </div>
                        <span className={layoutStyles.skuMetaSep} aria-hidden>·</span>
                        <div className={layoutStyles.skuMetaItem}>
                          <span className={layoutStyles.skuMetaLabel}>Preço:</span>
                          <div className={layoutStyles.skuMetaValue}>
                            {isEditing ? (
                              <>
                                <input
                                  ref={priceInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  size={inputSize}
                                  defaultValue={initialFormattedValue}
                                  onChange={handlePriceChange}
                                  onBlur={() => handlePriceBlur(sku, row.id)}
                                  onKeyDown={(e) => handlePriceKeyDown(e, sku, row.id)}
                                  placeholder="0,00"
                                  aria-label={`Editar preço de ${sku.displayName}`}
                                  className={layoutStyles.priceInput}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {err && <div className={layoutStyles.priceError}>{err.message}</div>}
                              </>
                            ) : (
                              <button
                                type="button"
                                className={layoutStyles.priceDisplay}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPriceSkuId(sku.id);
                                  setPriceError(null);
                                }}
                                disabled={isSaving}
                              >
                                <span>{formatPrice(displayPrice)}</span>
                                <Pencil size={12} className={layoutStyles.priceEditIcon} aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/admin/products/${row.id}?tab=skus&skuMode=edit&skuId=${sku.id}`}
                        className={layoutStyles.skuMetaAction}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Editar SKU ${sku.displayName}`}
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }}
        actionsRenderer={(row: ProductRow) => (
          <div className={layoutStyles.actionsCell}>
            <div
              className={layoutStyles.menuWrap}
              ref={openMenuProductId === row.id ? menuRef : undefined}
            >
              <button
                type="button"
                className={layoutStyles.menuTrigger}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuProductId((id) => (id === row.id ? null : row.id));
                }}
                aria-haspopup="menu"
                aria-expanded={openMenuProductId === row.id}
                aria-label="Mais opções"
              >
                <MoreVertical size={18} aria-hidden />
              </button>
              {openMenuProductId === row.id && (
                <div
                  className={layoutStyles.menuDropdown}
                  role="menu"
                  aria-label="Ações do produto"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={layoutStyles.menuDropdownItem}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const res = await toggleProductAction(row.id);
                      setOpenMenuProductId(null);
                      if (res.ok) {
                        router.refresh();
                      } else {
                        alert(res.error);
                      }
                    }}
                  >
                    {row.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={layoutStyles.menuDropdownItem}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const res = await duplicateProductAction(row.id);
                      setOpenMenuProductId(null);
                      if (res && !res.ok) alert(res.error);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={layoutStyles.menuDropdownItem}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Excluir este produto? Esta ação não pode ser desfeita.")) {
                        setOpenMenuProductId(null);
                        return;
                      }
                      const res = await deleteProductAction(row.id);
                      setOpenMenuProductId(null);
                      if (res && !res.ok) alert(res.error);
                    }}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        stickyHeader={true}
        sortable={true}
        onSort={handleSort}
        sortColumn={sort}
        sortDirection={dir}
        tableId="products-table"
      />
    </div>
  );
}
