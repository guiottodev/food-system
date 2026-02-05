"use client";

import { useEffect, useRef, useState } from "react";
import { reconfirmOrderAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "../orderDetail.module.css";

const MIN_REASON_LENGTH = 8;

type OrderReconfirmModalProps = {
  orderId: string;
  label?: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
};

export default function OrderReconfirmModal({
  orderId,
  label = "Marcar como reconfirmado",
  variant = "ghost",
  size = "sm",
  className,
}: OrderReconfirmModalProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const buttonClass = [
    styles.button,
    size === "sm" ? styles.buttonSm : "",
    variant === "primary" ? styles.buttonPrimary : styles.buttonGhost,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      event.preventDefault();
      setError(`Informe ao menos ${MIN_REASON_LENGTH} caracteres.`);
      textareaRef.current?.focus();
      return;
    }
    const confirmed = window.confirm("Marcar como reconfirmado?");
    if (!confirmed) {
      event.preventDefault();
      return;
    }
  }

  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <div className={detailStyles.reconfirmModalOverlay} onClick={() => setOpen(false)}>
          <div
            className={detailStyles.reconfirmModalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={detailStyles.reconfirmModalHeader}>
              <h3 className={detailStyles.reconfirmModalTitle}>Reconfirmar pedido</h3>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                onClick={() => setOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className={detailStyles.reconfirmModalBody}>
              <p className={detailStyles.reconfirmModalHint}>
                Explique rapidamente o que foi reconfirmado (ex.: alterei horario e
                confirmei no WhatsApp).
              </p>
              <form action={reconfirmOrderAction} onSubmit={handleSubmit}>
                <input type="hidden" name="orderId" value={orderId} />
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Motivo da reconfirmacao</span>
                  <textarea
                    ref={textareaRef}
                    name="reconfirmReason"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (error) setError("");
                    }}
                    minLength={MIN_REASON_LENGTH}
                    required
                    rows={3}
                    className={`${styles.control} ${styles.controlTextarea}`}
                  />
                  {error ? <span className={styles.textError}>{error}</span> : null}
                </label>
                <div className={detailStyles.reconfirmModalFooter}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonGhost}`}
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Marcar como reconfirmado
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
