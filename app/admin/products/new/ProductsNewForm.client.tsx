"use client";

import { useState, type ChangeEvent, type FocusEvent } from "react";
import { Plus } from "lucide-react";
import Switch from "../../_components/Switch";
import Select, { type SelectOption } from "../../_components/Select";
import CategoryCombobox from "../../_components/CategoryCombobox.client";
import CategoryModal from "../../_components/CategoryModal.client";
import styles from "../../_styles/adminPrimitives.module.css";
import {
  formatDecimalDisplay,
  getUnitPriceDecimals,
  normalizeDecimalInput,
  parseDecimalInput,
} from "@/lib/price";

type CategoryOption = {
  id: string;
  label: string;
};

type ProductsNewFormProps = {
  categories: CategoryOption[];
  recentCategories: CategoryOption[];
  parentCategories: CategoryOption[];
  allCategories: Array<{ id: string; name: string; parentId: string | null }>;
  createProductAction: (formData: FormData) => void;
};

function formatPriceForDisplay(value: number, unitTypeValue: string): string {
  return formatDecimalDisplay(value, getUnitPriceDecimals(unitTypeValue));
}

export default function ProductsNewForm({
  categories,
  recentCategories,
  parentCategories,
  allCategories,
  createProductAction,
}: ProductsNewFormProps) {
  const [productActive, setProductActive] = useState(true);
  const [skuActive, setSkuActive] = useState(true);
  const [priceValue, setPriceValue] = useState("");
  const [skuReference, setSkuReference] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitType, setUnitType] = useState("UNIDADE");
  const [unitChangeNotice, setUnitChangeNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(
    () => [...categories]
  );

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = normalizeDecimalInput(
      e.target.value,
      getUnitPriceDecimals(unitType)
    );
    setPriceValue(formatted);
  };

  const handlePriceBlur = (e: FocusEvent<HTMLInputElement>) => {
    const parsed = parseDecimalInput(
      e.target.value,
      getUnitPriceDecimals(unitType)
    );
    if (parsed) {
      setPriceValue(formatPriceForDisplay(parsed.value, unitType));
    }
  };

  const handleUnitTypeChange = (value: string) => {
    if (value === unitType) return;
    const prevDecimals = getUnitPriceDecimals(unitType);
    const nextDecimals = getUnitPriceDecimals(value);
    const parsed = parseDecimalInput(priceValue, prevDecimals);
    if (parsed) {
      setPriceValue(formatDecimalDisplay(parsed.value, nextDecimals));
    }
    if (prevDecimals > nextDecimals) {
      setUnitChangeNotice("O preco foi ajustado para 2 casas decimais.");
    } else {
      setUnitChangeNotice("");
    }
    setUnitType(value);
  };

  const handleCategoryCreated = (
    newCategoryId: string,
    newCategoryLabel: string
  ) => {
    setCategoryOptions((prev) => {
      if (prev.some((option) => option.id === newCategoryId)) return prev;
      return [...prev, { id: newCategoryId, label: newCategoryLabel }];
    });
    setCategoryId(newCategoryId);
  };

  const unitTypeOptions: SelectOption[] = [
    { value: "UNIDADE", label: "UNIDADE" },
    { value: "KG", label: "KG" },
  ];

  const priceDecimals = getUnitPriceDecimals(unitType);
  const priceHiddenValue = priceValue
    ? parseDecimalInput(priceValue, priceDecimals)?.value.toFixed(priceDecimals) ?? ""
    : "";

  return (
    <>
      <form action={createProductAction} className={styles.stackMd}>
        <section className={`${styles.panel} ${styles.panelPrimary}`}>
          <div className={styles.panelHeader}>
            <h2>Essencial</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nome</span>
                <input
                  name="name"
                  placeholder="Nome do produto"
                  required
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Categoria</span>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <CategoryCombobox
                      name="categoryId"
                      options={categoryOptions}
                      recentOptions={recentCategories}
                      value={categoryId}
                      onChange={setCategoryId}
                      onCreateCategory={() => setModalOpen(true)}
                      required
                      aria-label="Categoria"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    style={{
                      height: "44px",
                      padding: "0 var(--space-3)",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                    }}
                    aria-label="Criar nova categoria"
                  >
                    <Plus size={18} aria-hidden="true" />
                    Nova
                  </button>
                </div>
              </label>
            </div>
            <div className={styles.switchRow}>
              <Switch
                checked={productActive}
                onChange={setProductActive}
                label="Ativo"
                aria-label="Produto ativo"
                id="product-active-switch"
              />
              {productActive ? (
                <input
                  type="hidden"
                  name="isActive"
                  value="on"
                />
              ) : null}
            </div>
            <p className={styles.textMuted}>
              Cadastre o primeiro SKU agora (obrigatorio para vender).
            </p>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.panelSecondary}`}>
          <div className={styles.panelHeader}>
            <h2>Primeiro SKU (obrigatorio)</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Nome exibido</span>
                <input
                  name="skuDisplayName"
                  placeholder="Nome do SKU"
                  required
                  className={styles.control}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Referencia (opcional)</span>
                <input
                  name="skuReferencia"
                  placeholder="Ex.: 123ABC"
                  value={skuReference}
                  maxLength={50}
                  onChange={(event) => setSkuReference(event.target.value)}
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tipo de venda</span>
                <Select
                  name="skuUnitType"
                  options={unitTypeOptions}
                  value={unitType}
                  onChange={handleUnitTypeChange}
                  required
                  aria-label="Tipo de venda"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Preco atual</span>
                <div className={styles.moneyInputWrapper}>
                  <span className={styles.moneyPrefix}>R$</span>
                  <input
                    type="text"
                    placeholder={priceDecimals === 4 ? "0,0000" : "0,00"}
                    inputMode="decimal"
                    required
                    value={priceValue}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    className={`${styles.control} ${styles.moneyInput}`}
                  />
                </div>
                <input
                  type="hidden"
                  name="skuPriceCurrent"
                  value={priceHiddenValue}
                />
                {unitChangeNotice ? (
                  <span className={styles.textMuted}>{unitChangeNotice}</span>
                ) : null}
              </label>
            </div>
            <div className={styles.switchRow}>
              <Switch
                checked={skuActive}
                onChange={setSkuActive}
                label="Ativo"
                aria-label="SKU ativo"
                id="sku-active-switch"
              />
              {skuActive ? (
                <input
                  type="hidden"
                  name="skuIsActive"
                  value="on"
                />
              ) : null}
            </div>
            <p className={styles.textMuted}>
              Voce podera editar mais detalhes do SKU depois de criar o produto.
            </p>
          </div>
        </section>

        <div className={styles.panelFooter}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Criar produto
          </button>
        </div>
      </form>

      {modalOpen ? (
        <CategoryModal
          key="new-category"
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleCategoryCreated}
          parentOptions={parentCategories}
          allCategories={allCategories}
        />
      ) : null}
    </>
  );
}
