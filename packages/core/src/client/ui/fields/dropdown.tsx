import classNames from "classnames";
import React, {
  InputHTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from "react";
import SelectSearch, { SelectSearchProps } from "react-select-search";
import { useDirtyInput } from "./dirtyable";
import styles from "./fields.scss";

interface DropdownProps<T>
  extends Omit<InputHTMLAttributes<HTMLSelectElement>, "value"> {
  label?: string;
  className?: string;
  options: T[];
  value?: T;
  toLabel: (opt: T) => string;
  toKey: (opt: T) => string;
  setValue: (opt?: T) => void;
  placeholder?: string;
}

export function Dropdown<T>({
  label,
  className,
  options,
  value,
  toLabel,
  toKey,
  setValue,
  placeholder,
  ...props
}: DropdownProps<T>) {
  const [keyToValue, keyToLabel] = useMemo(() => {
    return [
      new Map(options.map((o) => [toKey(o), o])),
      new Map(options.map((o) => [toKey(o), toLabel(o)])),
    ];
  }, [options, toKey, toLabel]);
  const _value = useMemo(() => (value ? toKey(value) : ""), [value, toKey]);
  const dirty = useDirtyInput(_value);

  const field = (
    <select
      className={classNames(className, styles.input, {
        [styles.dirty]: dirty,
      })}
      value={_value}
      onChange={(e) => {
        setValue(keyToValue.get(e.target.value));
      }}
      {...props}
    >
      <option value="" disabled>
        {placeholder ?? "Select an Option"}
      </option>
      {Array.from(keyToLabel).map(([key, v]) => (
        <option key={key} value={key}>
          {v}
        </option>
      ))}
    </select>
  );
  if (label) {
    return (
      <label className={styles.label}>
        <span>{label}</span>
        {field}
      </label>
    );
  }
  return field;
}

type SelectProps = InputHTMLAttributes<HTMLSelectElement> & {
  dirtyable?: boolean;
  big?: boolean;
};
export const Select = ({
  dirtyable = true,
  big,
  className,
  value,
  onChange,
  ...props
}: SelectProps) => {
  const [_value, _setValue] = useState(value);
  useDirtyInput(dirtyable ? _value : "");
  useEffect(() => _setValue(value), [value]);
  return (
    <select
      className={classNames(className, styles.input, {
        [styles.big]: big,
      })}
      {...props}
      value={_value}
      onChange={(e) => {
        _setValue(e.target.value);
        onChange && onChange(e);
      }}
    />
  );
};

type SearchDropdownProps = SelectSearchProps & {
  label?: string;
  dirtyable?: boolean;
};
export const SearchDropdown = ({
  dirtyable = true,
  label,
  ...props
}: SearchDropdownProps) => {
  useDirtyInput(dirtyable ? props.value : "");

  const field = <SelectSearch {...props} />;

  if (label) {
    return (
      <label className={styles.label}>
        <span>{label}</span>
        {field}
      </label>
    );
  }
  return field;
};
