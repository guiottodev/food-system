"use client";

import React, { useId } from "react";
import styles from "./Switch.module.css";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  "aria-label": string;
  disabled?: boolean;
  id?: string;
}

export default function Switch({
  checked,
  onChange,
  label,
  "aria-label": ariaLabel,
  disabled = false,
  id,
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className={styles.switchContainer}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? `${ariaLabel}: ${label}` : ariaLabel}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`${styles.switch} ${checked ? styles.switchChecked : ""} ${disabled ? styles.switchDisabled : ""}`}
        id={switchId}
      >
        <span className={styles.switchThumb} aria-hidden />
      </button>
      {label && (
        <label htmlFor={switchId} className={styles.switchLabel}>
          {label}
        </label>
      )}
    </div>
  );
}
