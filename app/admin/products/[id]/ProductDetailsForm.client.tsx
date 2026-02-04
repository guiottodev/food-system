"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Switch from "../../_components/Switch";
import CategoryCombobox from "../../_components/CategoryCombobox.client";
import CategoryModal from "../../_components/CategoryModal.client";
import { updateProductAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

type CategoryOption = {
  id: string;
  label: string;
};

type ProductDetailsFormProps = {
  product: {
    id: string;
    name: string;
    categoryId: string;
    descriptionLong: string | null;
    isActive: boolean;
  };
  categories: CategoryOption[];
  recentCategories: CategoryOption[];
  parentCategories: CategoryOption[];
  allCategories: Array<{ id: string; name: string; parentId: string | null }>;
  errorMessage?: string;
};

export default function ProductDetailsForm({
  product,
  categories,
  recentCategories,
  parentCategories,
  allCategories,
  errorMessage,
}: ProductDetailsFormProps) {
  const [isActive, setIsActive] = useState(product.isActive);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(
    () => [...categories]
  );

  const handleCategoryCreated = (newCategoryId: string, newCategoryLabel: string) => {
    setCategoryOptions((prev) => {
      if (prev.some((option) => option.id === newCategoryId)) return prev;
      return [...prev, { id: newCategoryId, label: newCategoryLabel }];
    });
    setCategoryId(newCategoryId);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Editar produto</h2>
      </div>
      <div className={styles.panelBody}>
        {errorMessage ? (
          <p className={styles.textError}>{errorMessage}</p>
        ) : null}
        <form action={updateProductAction} className={styles.formGrid}>
          <input type="hidden" name="id" value={product.id} />
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nome</span>
            <input
              name="name"
              defaultValue={product.name}
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
          <textarea
            name="descriptionLong"
            defaultValue={product.descriptionLong || ""}
            placeholder="Descricao longa"
            className={`${styles.control} ${styles.controlTextarea} ${styles.fieldFull}`}
          ></textarea>
          <div className={styles.switchRow}>
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Ativo"
              aria-label="Produto ativo"
              id="product-active-switch-edit"
            />
            {isActive ? (
              <input
                type="hidden"
                name="isActive"
                value="on"
              />
            ) : null}
          </div>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Salvar produto
          </button>
        </form>
      </div>

      {modalOpen ? (
        <CategoryModal
          key="edit-category"
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleCategoryCreated}
          parentOptions={parentCategories}
          allCategories={allCategories}
        />
      ) : null}
    </section>
  );
}
