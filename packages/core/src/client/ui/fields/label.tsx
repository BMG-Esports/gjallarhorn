import React from "react";
import styles from "./fields.scss";

export function Label({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.label}>
      <span>{label}</span>
      {children}
    </label>
  );
}
