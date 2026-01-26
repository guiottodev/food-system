"use client";

import { useState } from "react";
import Switch from "../../_components/Switch";
import Select, { type SelectOption } from "../../_components/Select";
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
  errorMessage?: string;
};

export default function ProductDetailsForm({
  product,
  categories,
  errorMessage,
}: ProductDetailsFormProps) {
  const [isActive, setIsActive] = useState(product.isActive);
  const [categoryId, setCategoryId] = useState(product.categoryId);

  const categoryOptions: SelectOption[] = categories.map((category) => ({
    value: category.id,
    label: category.label,
  }));

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
          <input
            name="name"
            defaultValue={product.name}
            required
            className={styles.control}
          />
          <Select
            name="categoryId"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            required
            aria-label="Categoria"
          />
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
    </section>
  );
}
