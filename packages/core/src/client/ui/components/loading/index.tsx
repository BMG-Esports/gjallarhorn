import React from "react";
import styles from "./style.scss";

export const Loading = () => {
  return (
    <div className={styles.loading}>
      <div />
      <div />
      <div />
    </div>
  );
};

export function Preloader({
  fields,
  children,
}: {
  fields: any[];
  children: React.ReactNode;
}) {
  const loaded = fields.every((f) => f !== undefined);
  if (loaded) return <>{children}</>;
  return (
    <div className={styles.container}>
      <Loading />
    </div>
  );
}
