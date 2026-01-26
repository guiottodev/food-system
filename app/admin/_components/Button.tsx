"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import styles from "./Button.module.css";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "asChild"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  density?: "comfortable" | "compact";
  loading?: boolean;
  asChild?: boolean;
  href?: string;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  density = "comfortable",
  loading = false,
  disabled,
  className,
  asChild,
  href,
  children,
  ...props
}: ButtonProps) {
  const baseClass = styles.button;
  const variantClass = styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`];
  const sizeClass = styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`];
  const densityClass = density === "compact" ? styles.buttonCompact : "";

  const isDisabled = disabled || loading;
  const classes = `${baseClass} ${variantClass} ${sizeClass} ${densityClass} ${className || ""}`.trim();

  if (asChild && React.isValidElement(children) && children.type === Link) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children as React.ReactElement<any>, {
      className: `${classes} ${(childProps.className as string) || ""}`.trim(),
      ...props,
    });
  }

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} {...(props as any)}>
        {loading && <Loader2 size={16} className={styles.buttonSpinner} aria-hidden />}
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 size={16} className={styles.buttonSpinner} aria-hidden />}
      {children}
    </button>
  );
}
