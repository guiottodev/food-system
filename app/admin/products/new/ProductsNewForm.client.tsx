"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Switch from "../../_components/Switch";
import Select, { type SelectOption } from "../../_components/Select";
import CategoryModal from "../../_components/CategoryModal.client";
import styles from "../../_styles/adminPrimitives.module.css";

type CategoryOption = {
  id: string;
  label: string;
};

type ProductsNewFormProps = {
  categories: CategoryOption[];
  parentCategories: CategoryOption[];
  allCategories: Array<{ id: string; name: string; parentId: string | null }>;
  error?: string;
  createProductAction: (formData: FormData) => void;
};

// Formatar entrada de preço (máscara monetária brasileira)
// Aceita digitação natural: "10" → "0,10", "100" → "1,00", "1000" → "10,00"
function formatPriceInput(value: string): string {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  
  // Converte para centavos e depois para reais
  const num = Number(numbers) / 100;
  
  // Formata com 2 casas decimais e vírgula
  return num.toFixed(2).replace(".", ",");
}

// Converter string formatada para número
function parsePriceInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export default function ProductsNewForm({
  categories,
  parentCategories,
  allCategories,
  error,
  createProductAction,
}: ProductsNewFormProps) {
  const [productActive, setProductActive] = useState(true);
  const [skuActive, setSkuActive] = useState(true);
  const [priceValue, setPriceValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitType, setUnitType] = useState("UNIDADE");
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>(() => [
    { value: "", label: "Selecione a categoria" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.label,
    })),
  ]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    setPriceValue(formatted);
  };

  const handlePriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    setPriceValue(formatted);
  };

  const handleCategoryCreated = (newCategoryId: string, newCategoryLabel: string) => {
    // Adicionar a nova categoria à lista e selecionar automaticamente
    const newCategoryOption: SelectOption = {
      value: newCategoryId,
      label: newCategoryLabel,
    };
    setCategoryOptions((prev) => {
      // Verificar se já existe para evitar duplicatas
      const exists = prev.some((opt) => opt.value === newCategoryId);
      if (exists) return prev;
      // Adicionar e ordenar
      const updated = [...prev, newCategoryOption].sort((a, b) => {
        if (a.value === "") return -1;
        if (b.value === "") return 1;
        return a.label.localeCompare(b.label);
      });
      return updated;
    });
    setCategoryId(newCategoryId);
  };

  const unitTypeOptions: SelectOption[] = [
    { value: "UNIDADE", label: "UNIDADE" },
    { value: "KG", label: "KG" },
  ];

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
                  <Select
                    name="categoryId"
                    options={categoryOptions}
                    value={categoryId}
                    onChange={setCategoryId}
                    required
                    placeholder="Selecione a categoria"
                    aria-label="Categoria"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  style={{ height: "44px", padding: "0 var(--space-3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "var(--space-1)" }}
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
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tipo de venda</span>
              <Select
                name="skuUnitType"
                options={unitTypeOptions}
                value={unitType}
                onChange={setUnitType}
                required
                aria-label="Tipo de venda"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Preço atual</span>
              <div className={styles.moneyInputWrapper}>
                <span className={styles.moneyPrefix}>R$</span>
                <input
                  type="text"
                  placeholder="0,00"
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
                value={priceValue ? parsePriceInput(priceValue).toString() : ""}
              />
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

    <CategoryModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      onSuccess={handleCategoryCreated}
      parentOptions={parentCategories}
      allCategories={allCategories}
    />
    </>
  );
}
