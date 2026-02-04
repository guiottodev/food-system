"use client";

import React, { useEffect } from "react";
import { List, Rows3 } from "lucide-react";
import styles from "./DensityToggle.module.css";

export interface DensityToggleProps {
  currentDensity: "comfortable" | "compact";
  onChange: (density: "comfortable" | "compact") => void;
  tableId: string;
}

export default function DensityToggle({
  currentDensity,
  onChange,
  tableId,
}: DensityToggleProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`table-density-${tableId}`);
    if (stored === "compact" || stored === "comfortable") {
      onChange(stored);
    }
  }, [tableId, onChange]);

  const handleToggle = () => {
    const newDensity = currentDensity === "comfortable" ? "compact" : "comfortable";
    onChange(newDensity);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`table-density-${tableId}`, newDensity);
    }
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={handleToggle}
      aria-label={`Alternar densidade: ${currentDensity === "comfortable" ? "Compacto" : "Confortável"}`}
      title={currentDensity === "comfortable" ? "Compacto" : "Confortável"}
    >
      {currentDensity === "comfortable" ? (
        <List size={18} aria-hidden />
      ) : (
        <Rows3 size={18} aria-hidden />
      )}
    </button>
  );
}
