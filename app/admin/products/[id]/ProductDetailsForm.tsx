import { updateProductAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

type CategoryOption = {
  id: string;
  name: string;
};

type ProductDetailsFormProps = {
  product: {
    id: string;
    name: string;
    categoryId: string;
    descriptionLong: string | null;
    isActive: boolean;
    isPublicHidden: boolean;
    sobConsulta: boolean;
  };
  categories: CategoryOption[];
  errorMessage?: string;
};

export default function ProductDetailsForm({
  product,
  categories,
  errorMessage,
}: ProductDetailsFormProps) {
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
          <select
            name="categoryId"
            defaultValue={product.categoryId}
            required
            className={styles.control}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <textarea
            name="descriptionLong"
            defaultValue={product.descriptionLong || ""}
            placeholder="Descricao longa"
            className={`${styles.control} ${styles.controlTextarea} ${styles.fieldFull}`}
          ></textarea>
          <label className={styles.choiceRow}>
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product.isActive}
            />
            <span className={styles.choiceLabel}>Ativo</span>
          </label>
          <label className={styles.choiceRow}>
            <input
              type="checkbox"
              name="isPublicHidden"
              defaultChecked={product.isPublicHidden}
            />
            <span className={styles.choiceLabel}>Ocultar do publico</span>
          </label>
          <label className={styles.choiceRow}>
            <input
              type="checkbox"
              name="sobConsulta"
              defaultChecked={product.sobConsulta}
            />
            <span className={styles.choiceLabel}>Sob consulta</span>
          </label>
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
