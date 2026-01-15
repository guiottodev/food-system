import { updateProductImagesAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

type ProductImagesFormProps = {
  productId: string;
  imageMainUrl: string | null;
  imageExtraUrls: string;
};

export default function ProductImagesForm({
  productId,
  imageMainUrl,
  imageExtraUrls,
}: ProductImagesFormProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Imagens</h2>
      </div>
      <div className={styles.panelBody}>
        <form action={updateProductImagesAction} className={styles.formSection}>
          <input type="hidden" name="id" value={productId} />
          <input
            name="imageMainUrl"
            defaultValue={imageMainUrl || ""}
            placeholder="URL da imagem principal"
            className={styles.control}
          />
          <textarea
            name="imageExtraUrls"
            defaultValue={imageExtraUrls}
            placeholder="URLs extras (uma por linha)"
            className={`${styles.control} ${styles.controlTextarea}`}
          ></textarea>
          <div className={styles.panelFooter}>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Salvar imagens
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
