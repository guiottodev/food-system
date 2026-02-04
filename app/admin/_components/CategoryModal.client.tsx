"use client";

import { useState, useEffect, useRef } from "react";
import { createCategoryActionJson } from "../categories/actions";
import Switch from "./Switch";
import Select, { type SelectOption } from "./Select";
import styles from "../_styles/adminPrimitives.module.css";
import modalStyles from "../categories/categories.module.css";
import { buildCategoryPathLabel, buildCategoryIndex } from "@/lib/domain/categoryHierarchy";

type CategoryOption = {
  id: string;
  label: string;
};

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoryId: string, categoryLabel: string) => void;
  parentOptions: CategoryOption[];
  allCategories: Array<{ id: string; name: string; parentId: string | null }>;
  initialParentId?: string;
};

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  parentOptions,
  allCategories,
  initialParentId = "",
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState(initialParentId);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      if (parentId) {
        formData.append("parentId", parentId);
      }
      formData.append("isActive", isActive ? "true" : "false");

      const result = await createCategoryActionJson(formData);

      if (result.error) {
        setError(result.error);
        setIsPending(false);
        return;
      }

      if (result.category) {
        // Construir o label completo da categoria criada
        const { byId } = buildCategoryIndex([...allCategories, result.category]);
        const categoryLabel = buildCategoryPathLabel(byId, result.category.id);
        onSuccess(result.category.id, categoryLabel);
        onClose();
      }
  } catch {
      setError("Erro ao criar categoria. Tente novamente.");
      setIsPending(false);
    }
  };

  if (!isOpen) return null;

  const parentSelectOptions: SelectOption[] = [
    { value: "", label: "(Sem pai) — categoria raiz" },
    ...parentOptions.map((opt) => ({
      value: opt.id,
      label: opt.label,
    })),
  ];

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalStyles.modalCard}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.modalTitle}>Nova categoria</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            Fechar
          </button>
        </div>

        <div className={modalStyles.modalBody}>
          {error ? <div className={styles.textError}>{error}</div> : null}

          <div className={modalStyles.modalHint}>
            Dica: selecione uma <strong>categoria pai</strong> para criar uma
            subcategoria (ex.: Salgados → Fritos).
          </div>

          <form onSubmit={handleSubmit} className={styles.formSection}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Categoria pai (opcional)</span>
              <Select
                options={parentSelectOptions}
                value={parentId}
                onChange={setParentId}
                placeholder="(Sem pai) — categoria raiz"
                aria-label="Categoria pai"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nome</span>
              <input
                ref={nameInputRef}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da categoria"
                required
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Descrição (opcional)</span>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da categoria"
                className={`${styles.control} ${styles.controlTextarea}`}
              />
            </label>
            <div className={styles.switchRow}>
              <Switch
                checked={isActive}
                onChange={setIsActive}
                label="Ativa"
                aria-label="Categoria ativa"
                id="category-active-switch-modal"
              />
            </div>
            <div className={modalStyles.modalFooter}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={isPending}
              >
                {isPending ? "Criando..." : "Criar categoria"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
