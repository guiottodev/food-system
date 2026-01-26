import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCategoryIndex, buildCategoryOptions, getDescendantCategoryIds, buildCategoryPathLabel } from "@/lib/domain/categoryHierarchy";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import ProductsFilters from "./ProductsFilters.client";
import ProductsTableExpandable from "./ProductsTableExpandable.client";
import PageSizeSelect from "./PageSizeSelect.client";

type ProductsSearchParams = {
  q?: string;
  categoryId?: string;
  active?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
  stock?: string;
  semSkuAtivo?: string;
  error?: string;
};

const PAGE_SIZES = [15, 30, 50];

function parseFilter(value: string | undefined, defaultValue: string) {
  return value || defaultValue;
}

function withQuery(
  base: string,
  params: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    sp.set(key, String(value));
  });
  const query = sp.toString();
  return query ? `${base}?${query}` : base;
}

function parsePage(value: string | undefined) {
  const page = Number(value ?? "1");
  if (Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

function parsePageSize(value: string | undefined) {
  const size = Number(value ?? PAGE_SIZES[0]);
  return PAGE_SIZES.includes(size) ? size : PAGE_SIZES[0];
}

function parseSort(value: string | undefined): "name" | "category" {
  if (value === "category") return "category";
  return "name";
}

function parseDir(value: string | undefined): "asc" | "desc" {
  if (value === "desc") return "desc";
  return "asc";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<ProductsSearchParams> | ProductsSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  if (sp?.error) {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });
    redirect(`/admin/products/new?${params.toString()}`);
  }

  const query = (sp?.q ?? "").trim();
  const categoryId = sp?.categoryId ?? "";
  const activeFilter = parseFilter(sp?.active, "all");
  const sort = parseSort(sp?.sort);
  const dir = parseDir(sp?.dir);
  const page = parsePage(sp?.page);
  const pageSize = parsePageSize(sp?.pageSize);
  const stock = sp?.stock ?? "";
  const semSkuAtivo = sp?.semSkuAtivo ?? "";

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, isActive: true },
  });

  const { byId, childrenByParent } = buildCategoryIndex(categories);
  const categoryFilterIds = categoryId
    ? [categoryId, ...getDescendantCategoryIds(childrenByParent, categoryId)]
    : [];
  const categoryOptions = buildCategoryOptions({
    categories,
    includeInactive: true,
  }).map((c) => ({ id: c.id, label: c.label }));

  const whereBase = {
    ...(query ? { name: { contains: query } } : {}),
    ...(categoryFilterIds.length ? { categoryId: { in: categoryFilterIds } } : {}),
    ...(activeFilter === "active" ? { isActive: true } : activeFilter === "inactive" ? { isActive: false } : {}),
  };

  const whereStock =
    stock === "in"
      ? { skus: { some: { stockQuantity: { gt: 0 } } } }
      : stock === "out"
      ? { skus: { some: {} }, NOT: { skus: { some: { stockQuantity: { gt: 0 } } } } }
      : {};

  const whereSemSkuAtivo =
    semSkuAtivo === "1"
      ? { skus: { some: {} }, NOT: { skus: { some: { isActive: true } } } }
      : {};

  const where = { ...whereBase, ...whereStock, ...whereSemSkuAtivo };

  const orderBy =
    sort === "category"
      ? { category: { name: dir } }
      : { name: dir };

  const [products, totalCount, countActive, countOutOfStock, countActiveSkus, totalSkus] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        category: true,
        skus: {
          select: {
            id: true,
            isActive: true,
            displayName: true,
            sizeText: true,
            flavorText: true,
            isFrozen: true,
            unitType: true,
            unitLabel: true,
            priceCurrent: true,
            stockQuantity: true,
          },
          orderBy: { displayName: "asc" },
        },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...where, isActive: true } }),
    prisma.product.count({
      where: {
        ...whereBase,
        ...whereSemSkuAtivo,
        skus: { some: {} },
        NOT: { skus: { some: { stockQuantity: { gt: 0 } } } },
      },
    }),
    prisma.sku.count({ where: { product: where, isActive: true } }),
    prisma.sku.count({ where: { product: where } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endIndex = totalCount === 0 ? 0 : Math.min(clampedPage * pageSize, totalCount);

  const baseParams = {
    q: query || undefined,
    categoryId: categoryId || undefined,
    active: activeFilter !== "all" ? activeFilter : undefined,
    stock: stock || undefined,
    semSkuAtivo: semSkuAtivo || undefined,
    sort: sort !== "name" ? sort : undefined,
    dir: dir !== "asc" ? dir : undefined,
    pageSize: pageSize !== PAGE_SIZES[0] ? pageSize : undefined,
  };

  const pageLink = (nextPage: number) =>
    withQuery("/admin/products", { ...baseParams, page: nextPage });

  const hasActiveFilters = !!(
    query ||
    categoryId ||
    (activeFilter && activeFilter !== "all") ||
    stock ||
    semSkuAtivo
  );

  const productsForTable = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageMainUrl: p.imageMainUrl,
    isActive: p.isActive,
    categoryLabel: buildCategoryPathLabel(byId, p.categoryId),
    skus: p.skus.map((s) => ({
      id: s.id,
      isActive: s.isActive,
      displayName: s.displayName,
      sizeText: s.sizeText,
      flavorText: s.flavorText,
      isFrozen: s.isFrozen,
      unitType: s.unitType,
      unitLabel: s.unitLabel,
      priceCurrent: Number(s.priceCurrent),
      stockQuantity: Number(s.stockQuantity),
    })),
  }));

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produtos</h1>
          <p className={layoutStyles.pageSubtitle}>Gerencie seu catálogo</p>
        </div>
        <div className={layoutStyles.kpiGrid}>
          <Link
            href={withQuery("/admin/products", {})}
            className={`${layoutStyles.kpiCard} ${layoutStyles.kpiCardLink}`}
          >
            <span className={layoutStyles.kpiValue}>{totalCount}</span>
            <span className={layoutStyles.kpiLabel}>produtos</span>
          </Link>
          <Link
            href={withQuery("/admin/products", { ...baseParams, active: "active", page: 1 })}
            className={`${layoutStyles.kpiCard} ${layoutStyles.kpiCardSuccess} ${layoutStyles.kpiCardLink}`}
          >
            <span className={layoutStyles.kpiValue}>{countActive}</span>
            <span className={layoutStyles.kpiLabel}>ativos</span>
          </Link>
          <Link
            href={withQuery("/admin/products", { ...baseParams, active: "active", page: 1 })}
            className={`${layoutStyles.kpiCard} ${layoutStyles.kpiCardLink}`}
          >
            <span className={layoutStyles.kpiValue}>
              {countActiveSkus} / {totalSkus}
            </span>
            <span className={layoutStyles.kpiLabel}>SKUs ativos</span>
          </Link>
          <Link
            href={withQuery("/admin/products", { ...baseParams, stock: "out", page: 1 })}
            className={`${layoutStyles.kpiCard} ${layoutStyles.kpiCardWarning} ${layoutStyles.kpiCardLink}`}
          >
            <span className={layoutStyles.kpiValue}>{countOutOfStock}</span>
            <span className={layoutStyles.kpiLabel}>Fora de estoque</span>
          </Link>
        </div>
      </div>

      <section className={`${styles.panel} ${layoutStyles.productsPanel}`}>
        <ProductsFilters
          categories={categoryOptions}
          initialQuery={query}
          initialCategoryId={categoryId}
          initialActive={activeFilter}
          initialStock={stock}
          initialSemSkuAtivo={semSkuAtivo}
        />

        {products.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIconWrap}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
              </svg>
            </div>
            <div className={layoutStyles.emptyStateTitle}>
              {hasActiveFilters ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
            </div>
            <div className={layoutStyles.emptyStateText}>
              {hasActiveFilters
                ? "Tente ajustar os filtros ou cadastre um novo produto."
                : "Comece adicionando um produto ao catálogo."}
            </div>
            <div className={layoutStyles.emptyStateActions}>
              <Link href="/admin/products/new" className={`${layoutStyles.primaryButton} ${layoutStyles.emptyStateCta}`}>
                Novo produto
              </Link>
              {hasActiveFilters && (
                <Link href="/admin/products" className={layoutStyles.emptyStateClearLink}>
                  Limpar filtros
                </Link>
              )}
            </div>
          </div>
        ) : (
          <ProductsTableExpandable
            products={productsForTable}
            sort={sort}
            dir={dir}
          />
        )}
      </section>

      {totalCount > 0 && (
        <div className={layoutStyles.paginationRow}>
          <div className={layoutStyles.paginationControls}>
            {clampedPage > 1 ? (
              <Link
                href={pageLink(clampedPage - 1)}
                className={layoutStyles.paginationButton}
              >
                <ChevronLeft size={18} />
                <span>Anterior</span>
              </Link>
            ) : (
              <span className={layoutStyles.paginationButtonDisabled}>
                <ChevronLeft size={18} />
                <span>Anterior</span>
              </span>
            )}
            <span className={layoutStyles.paginationInfo}>
              Página <strong>{clampedPage}</strong> de <strong>{totalPages}</strong>
            </span>
            {clampedPage < totalPages ? (
              <Link
                href={pageLink(clampedPage + 1)}
                className={layoutStyles.paginationButton}
              >
                <span>Próxima</span>
                <ChevronRight size={18} />
              </Link>
            ) : (
              <span className={layoutStyles.paginationButtonDisabled}>
                <span>Próxima</span>
                <ChevronRight size={18} />
              </span>
            )}
          </div>
          <div className={layoutStyles.paginationRight}>
            <span className={layoutStyles.paginationMeta}>
              Mostrando {startIndex}–{endIndex} de {totalCount}
            </span>
            <PageSizeSelect
              currentPageSize={pageSize}
              pageSizes={PAGE_SIZES}
            />
          </div>
        </div>
      )}
    </main>
  );
}
