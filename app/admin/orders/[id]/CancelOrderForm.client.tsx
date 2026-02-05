"use client";

import Button from "../../_components/Button";
import styles from "../../_styles/adminPrimitives.module.css";
import { cancelOrderAction } from "./actions";

export default function CancelOrderForm({ orderId }: { orderId: string }) {
  return (
    <form
      action={cancelOrderAction}
      className={styles.formSection}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Tem certeza que deseja cancelar este pedido?"
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input
        name="cancellationReason"
        placeholder="Motivo do cancelamento"
        className={styles.control}
        required
      />
      <Button type="submit" variant="outline">
        Cancelar pedido
      </Button>
    </form>
  );
}
