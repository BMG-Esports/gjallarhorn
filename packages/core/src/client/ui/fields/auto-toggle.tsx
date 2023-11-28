import classNames from "classnames";
import { Timer, TimerOff } from "lucide-react";
import React from "react";
import { Button } from "./button";
import { InputRow } from "./input-row";
import styles from "./fields.scss";

export const AutoToggle = ({
  enabled,
  disabled,
  setEnabled,
  children,
  label,
}: {
  children: React.ReactNode;
  enabled: boolean;
  disabled?: boolean;
  setEnabled: (e: boolean) => void;
  label: string;
}) => {
  return (
    <InputRow noGap>
      {children}
      <Button
        icon
        className={classNames(styles.autoToggle, { [styles.enabled]: enabled })}
        onClick={() => setEnabled(!enabled)}
        disabled={disabled}
      >
        {enabled ? <Timer /> : <TimerOff />}
        {label}
      </Button>
    </InputRow>
  );
};
