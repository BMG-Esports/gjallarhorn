import classNames from "classnames";
import React from "react";

import styles from "./style.scss";

export function TabGroup({
  tabs,
  active,
  setActive,
}: {
  tabs: Map<string, string>;
  active: string;
  setActive: (tab: string) => void;
}) {
  return (
    <div className={styles.tabGroup}>
      {Array.from(tabs.keys()).map((k) => (
        <div
          key={k}
          className={classNames({ [styles.active]: active === k })}
          onClick={() => setActive(k)}
        >
          {tabs.get(k)}
        </div>
      ))}
    </div>
  );
}
