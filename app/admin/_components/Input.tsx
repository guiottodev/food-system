"use client";

import React from "react";
import styles from "./Input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "error" | "success";
  density?: "comfortable" | "compact";
}

export default function Input({
  variant = "default",
  density = "comfortable",
  className,
  ...props
}: InputProps) {
  const baseClass = styles.input;
  const variantClass = variant !== "default" ? styles[`input${variant.charAt(0).toUpperCase() + variant.slice(1)}`] : "";
  const densityClass = density === "compact" ? styles.inputCompact : "";

  return (
    <input
      className={`${baseClass} ${variantClass} ${densityClass} ${className || ""}`}
      {...props}
    />
  );
}
