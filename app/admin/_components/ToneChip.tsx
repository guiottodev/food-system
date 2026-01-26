"use client";

import React from "react";
import styles from "./ToneChip.module.css";

export interface ToneChipProps {
  tone: "success" | "neutral" | "warning" | "danger";
  label: string;
  density?: "comfortable" | "compact";
  className?: string;
}

export default function ToneChip({
  tone,
  label,
  density = "comfortable",
  className,
}: ToneChipProps) {
  const baseClass = styles.toneChip;
  const toneClass = styles[`toneChip${tone.charAt(0).toUpperCase() + tone.slice(1)}`];
  const densityClass = density === "compact" ? styles.toneChipCompact : "";

  return (
    <span
      className={`${baseClass} ${toneClass} ${densityClass} ${className || ""}`}
      role="status"
      aria-label={label}
    >
      {label}
    </span>
  );
}
