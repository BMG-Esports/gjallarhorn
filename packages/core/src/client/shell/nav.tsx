import React from "react";
import { Inlet, Outlet } from "react-conduit";

import styles from "./shell.scss";

const label = "shell/nav";

export function Nav({ children }: { children: React.ReactNode | null }) {
  return <Inlet label={label}>{children}</Inlet>;
}

export function _NavOutlet({ ...props }: any) {
  return <Outlet label={label} {...props} />;
}

export function Spacer() {
  return <div className={styles.spacer} />;
}
