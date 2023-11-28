import classNames from "classnames";
import React from "react";
import styles from "./fields.scss";

export const InputRow = ({
  children,
  noGap,
}: {
  children: React.ReactNode;
  noGap?: boolean;
}) => {
  return (
    <div className={classNames(styles.row, { [styles.noGap]: noGap })}>
      {children}
    </div>
  );
};
