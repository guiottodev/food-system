"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, MoreVertical, Pencil } from "lucide-react";
import ProductThumb from "./ProductThumb.client";
import {
  deleteProductAction,
  duplicateProductAction,
  toggleProductAction,
  updateSkuPriceAction,
} from "./actions";
import layoutStyles from "./products.module.css";

type SortKey = "name" | "category";
type SortDir = "asc" | "desc";

function SortIcon({
  sortKey,
  currentSort,
  currentDir,
  className,
}: {
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  className?: string;
}) {
  if (currentSort !== sortKey) {
    return <ArrowUpDown size={14} className={className} aria-hidden />;
  }
  return currentDir === "asc" ? (
    <ArrowUp size={14} className={className} aria-hidden />
  ) : (
    <ArrowDown size={14} className={className} aria-hidden />
  );
}

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
  sort?: SortKey;
  dir?: SortDir;
};

function formatPrice(n: number): string {
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function formatPriceInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  
  // Converte para número e divide por 100 para ter centavos
  const num = Number(numbers) / 100;
  
  // Formata com 2 casas decimais
  return num.toFixed(2).replace(".", ",");
}

function parsePriceInput(value: string): number {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return 0;
  
  // Converte para número e divide por 100 para ter centavos
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
  const parts = [sku.sizeText, sku.flavorText || null, sku.isFrozen ? "Congelado" : null].filter(Boolean) as string[];
  return parts.length ? parts.join(" · ") : "";
}

export default function ProductsTableExpandable({ products, sort = "name", dir = "asc" }: ProductsTableExpandableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
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

  const getNextSortDir = useCallback((key: SortKey): SortDir => {
    return sort === key && dir === "desc" ? "asc" : "desc";
  }, [sort, dir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", key);
      params.set("dir", getNextSortDir(key));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, getNextSortDir]
  );

  const toggleExpand = useCallback((productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    if (priceInputRef.current) {
      priceInputRef.current.value = formatted;
      // Ajusta o tamanho do campo baseado no conteúdo
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

  return (
    <div className={layoutStyles.tableContainer}>
      <table className={layoutStyles.productsTable}>
        <thead>
          <tr>
            <th
              className={layoutStyles.thSortable}
              onClick={() => handleSort("name")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("name");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={sort === "name" ? (dir === "asc" ? "ascending" : "descending") : undefined}
            >
              Produto
              <span className={`${layoutStyles.thSortIcon} ${sort === "name" ? layoutStyles.thSortIconActive : ""}`}>
                <SortIcon sortKey="name" currentSort={sort} currentDir={dir} />
              </span>
            </th>
            <th
              className={layoutStyles.thSortable}
              onClick={() => handleSort("category")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("category");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={sort === "category" ? (dir === "asc" ? "ascending" : "descending") : undefined}
            >
              Categoria
              <span className={`${layoutStyles.thSortIcon} ${sort === "category" ? layoutStyles.thSortIconActive : ""}`}>
                <SortIcon sortKey="category" currentSort={sort} currentDir={dir} />
              </span>
            </th>
            <th className={layoutStyles.colNumeric} title="SKUs ativos / total. Unidade de cada SKU ao expandir.">
              SKUs / Un.
            </th>
            <th className={layoutStyles.colDisponivel} title="Quantidade em estoque (pronta entrega). Destaque quando zero.">
              Disponível
            </th>
            <th className={layoutStyles.colPreco} title="Preço por SKU. Na linha do produto: menor preço entre ativos.">
              <div className={layoutStyles.priceHeaderContent}>
                <span>Preço</span>
                <span className={layoutStyles.priceHeaderHint}>(a partir de)</span>
              </div>
            </th>
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
            const activeWithPrice = product.skus.filter((s) => s.isActive && typeof s.priceCurrent === "number");
            const minPrice = activeWithPrice.length ? Math.min(...activeWithPrice.map((s) => s.priceCurrent)) : null;

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
                  <td
                    className={layoutStyles.colDisponivel}
                    title="Ver produção"
                  >
                    {product.skus.length === 0 ? (
                      "—"
                    ) : (
                      <Link
                        href={`/admin/capacidade?q=${encodeURIComponent(product.name)}`}
                        className={layoutStyles.actionLink}
                        title="Ver produção"
                      >
                        {disponivelX} de {disponivelY} disponíveis
                      </Link>
                    )}
                  </td>
                  <td
                    className={layoutStyles.colPreco}
                    title={minPrice != null ? "Menor preço entre SKUs ativos" : "Apenas SKUs inativos ou sem preço"}
                  >
                    {minPrice != null ? formatPrice(minPrice) : "Variável"}
                  </td>
                  <td className={layoutStyles.colActions}>
                    <span className={layoutStyles.actionLinksWrap}>
                      <Link href={`/admin/products/${product.id}`} className={layoutStyles.actionLink}>
                        Ver
                      </Link>
                    </span>
                    <div
                      className={layoutStyles.menuWrap}
                      ref={openMenuProductId === product.id ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        className={layoutStyles.menuTrigger}
                        onClick={() =>
                          setOpenMenuProductId((id) => (id === product.id ? null : product.id))
                        }
                        aria-haspopup="menu"
                        aria-expanded={openMenuProductId === product.id}
                        aria-label="Mais opções"
                      >
                        <MoreVertical size={18} aria-hidden />
                      </button>
                      {openMenuProductId === product.id && (
                        <div
                          className={layoutStyles.menuDropdown}
                          role="menu"
                          aria-label="Ações do produto"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className={layoutStyles.menuDropdownItem}
                            onClick={async () => {
                              const res = await toggleProductAction(product.id);
                              setOpenMenuProductId(null);
                              if (res.ok) {
                                router.refresh();
                              } else {
                                alert(res.error);
                              }
                            }}
                          >
                            {product.isActive ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={layoutStyles.menuDropdownItem}
                            onClick={async () => {
                              const res = await duplicateProductAction(product.id);
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
                            onClick={async () => {
                              if (!confirm("Excluir este produto? Esta ação não pode ser desfeita.")) {
                                setOpenMenuProductId(null);
                                return;
                              }
                              const res = await deleteProductAction(product.id);
                              setOpenMenuProductId(null);
                              if (res && !res.ok) alert(res.error);
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
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
                      const isSaving = savingPriceSkuId === sku.id;
                      const displayPrice = skusPriceCache[sku.id] ?? sku.priceCurrent;
                      const err = priceError?.skuId === sku.id ? priceError : null;
                      const initialFormattedValue = formatPriceInput(String(Math.round(displayPrice * 100)).padStart(3, "0"));
                      const inputSize = Math.max(5, Math.min(12, initialFormattedValue.length + 1));

                      return (
                        <tr key={sku.id} className={layoutStyles.tableRowChild}>
                          <td>
                            <div className={layoutStyles.skuCellIndent}>
                              <strong>{sku.displayName}</strong>
                              {skuSubline(sku) ? (
                                <div className={layoutStyles.skuSubline}>{skuSubline(sku)}</div>
                              ) : null}
                              {!sku.isActive && (
                                <span className={`${layoutStyles.statusBadge} ${layoutStyles.statusInactive}`}>
                                  Inativo
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={layoutStyles.categoryName} title="Categoria do produto">
                              {product.categoryLabel}
                            </span>
                          </td>
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
                                    type="text"
                                    inputMode="decimal"
                                    size={inputSize}
                                    defaultValue={initialFormattedValue}
                                    onChange={handlePriceChange}
                                    onBlur={() => handlePriceBlur(sku, product.id)}
                                    onKeyDown={(e) => handlePriceKeyDown(e, sku, product.id)}
                                    placeholder="0,00"
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
                                  disabled={isSaving}
                                >
                                  <span>{formatPrice(displayPrice)}</span>
                                  <Pencil size={12} className={layoutStyles.priceEditIcon} aria-hidden />
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
