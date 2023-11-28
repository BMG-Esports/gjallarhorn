import classNames from "classnames";
import React, { ComponentProps } from "react";
import { Check, X } from "lucide-react";
import Moment from "react-moment";
import Popup from "reactjs-popup";
import { Button } from "../../fields/button";

import styles from "./style.scss";
import { PushButtonState } from "../../../../@types/types";

interface PushButtonProps extends ComponentProps<typeof Button> {
  state?: PushButtonState;
}

export const PushButton = React.forwardRef<HTMLButtonElement, PushButtonProps>(
  ({ state, disabled, ...props }, ref) => {
    let loading = false,
      success = false,
      failure = false;
    if (state && typeof state.status === "number") {
      loading = state.status === 0;
      success = state.status === 1;
      failure = state.status === -1;
    }

    return (
      <Popup
        disabled={!state?.lastPush}
        className="up"
        on="hover"
        trigger={
          <span
            className={classNames(styles.pushButton, {
              [styles.loading]: loading,
              [styles.status]: success || failure,
            })}
          >
            <Button disabled={disabled || loading} ref={ref} {...props} />
            <div className={styles.loadingIcon}>
              <div />
              <div />
              <div />
            </div>
            {(success || failure) && (
              <div className={styles.statusIcon}>
                {success && <Check />}
                {failure && <X />}
              </div>
            )}
          </span>
        }
        keepTooltipInside
      >
        <div className="popup-tooltip">
          <div style={{ color: "rgba(var(--fg), 80%)", marginBottom: 2 }}>
            <Moment date={state?.lastPush} format="h:mm:ss A" interval={0} />
          </div>
          <Moment date={state?.lastPush} fromNow interval={0} />
        </div>
      </Popup>
    );
  }
);
PushButton.displayName = "PushButton";
