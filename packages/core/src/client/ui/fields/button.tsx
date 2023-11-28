import classNames from "classnames";
import React, { ButtonHTMLAttributes } from "react";

import styles from "./fields.scss";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  big?: boolean;
  flat?: boolean;
  icon?: boolean;
  dirty?: boolean;
  enabled?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, big, flat, icon, dirty, enabled, ...props }, ref) => (
    <button
      ref={ref}
      className={classNames(className, styles.button, {
        [styles.big]: big,
        [styles.flat]: flat,
        [styles.icon]: icon,
        [styles.dirty]: dirty,
        [styles.enabled]: enabled,
      })}
      {...props}
    />
  )
);
Button.displayName = "Button";
