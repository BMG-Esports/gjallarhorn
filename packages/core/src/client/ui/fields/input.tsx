import classNames from "classnames";
import { CheckCircle, Circle } from "lucide-react";
import React, {
  ChangeEvent,
  InputHTMLAttributes,
  useEffect,
  useState,
} from "react";

import { useDirtyInput } from "./dirtyable";
import styles from "./fields.scss";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  dirtyable?: boolean;
  label?: string;
  className?: string;
  big?: boolean;
  inverted?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>["type"] | "textarea";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      dirtyable = true,
      label,
      type,
      className,
      inverted,
      big,
      value,
      onChange,
      checked,
      ...props
    },
    ref
  ) => {
    const [_value, _setValue] = useState(value);
    const [_checked, setChecked] = useState(checked);
    const dirty = useDirtyInput(dirtyable ? _value : "");

    useEffect(() => _setValue(value), [value]);
    useEffect(() => setChecked(checked), [checked]);

    const tag = type === "textarea" ? "textarea" : "input";

    const field = React.createElement(tag, {
      ref,
      type,
      className: classNames(className, styles.input, {
        [styles.dirty]: dirty || inverted,
        [styles.big]: big,
      }),
      value: _value,
      checked: _checked,
      onChange(e: ChangeEvent<HTMLInputElement>) {
        _setValue(e.target.value);
        setChecked(e.target.checked);
        onChange && onChange(e);
      },
      ...props,
    });

    if (label) {
      return (
        <label
          className={classNames(styles.label, {
            [styles.inline]: ["checkbox", "radio"].includes(type),
          })}
        >
          <span>{label}</span>
          {field}
          {type === "checkbox" && (_checked ? <CheckCircle /> : <Circle />)}
        </label>
      );
    }
    return field;
  }
);
Input.displayName = "Input";
