"use client";

import React from "react";
import { OrderStatus } from "@prisma/client";
import styles from "./Chip.module.css";

export interface ChipProps {
  variant: "status" | "attention-strong" | "attention-weak";
  status?: OrderStatus;
  label: string;
  density?: "comfortable" | "compact";
  className?: string;
}

export default function Chip({
  variant,
  status,
  label,
  density = "comfortable",
  className,
}: ChipProps) {
  const baseClass = styles.chip;
  const variantClass = styles[`chip${variant.charAt(0).toUpperCase() + variant.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`];
  const statusClass = variant === "status" && status ? styles[`chipStatus${status}`] : "";
  const densityClass = density === "compact" ? styles.chipCompact : "";

  return (
    <span
      className={`${baseClass} ${variantClass} ${statusClass} ${densityClass} ${className || ""}`}
      role="status"
      aria-label={label}
    >
      {label}
    </span>
  );
}
