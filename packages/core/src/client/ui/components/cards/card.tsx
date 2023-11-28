import classNames from "classnames";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Popup from "reactjs-popup";
import { CardProps } from ".";
import styles from "./style.scss";

const colors = [
  "transparent",
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
];

type Props = CardProps & {
  title: string;
  icon: React.ReactNode;
  header?: React.ReactNode;
  children?: React.ReactNode;
  dirty?: boolean;
};

export function Subheader(props: React.ComponentProps<"div">) {
  return <div className={styles.subheader} {...props} />;
}

export const Card = forwardRef<HTMLDivElement, Props>(
  (
    {
      setCollapsed,
      color,
      setColor,
      dragging,
      setDragging,
      dropTarget,
      onDrop,
      x,
      y,
      width,
      height,
      mode,
      title,
      icon,
      header,
      children,
      dirty,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [previewColor, setPreviewColor] = useState<string>(undefined);
    const [showDropZone, setShowDropZone] = useState<number>(0);
    const rootDiv = useRef<HTMLDivElement>();
    const mouseDown = useRef(false);
    useEffect(() => {
      const onMouseUp = () => (mouseDown.current = false);
      document.addEventListener("mouseup", onMouseUp);
      return () => document.removeEventListener("mouseup", onMouseUp);
    });

    const collapsed = mode === "collapsed",
      dragHelper = mode === "drag-helper";

    // Preview color takes precedence
    const accentColor = previewColor ?? color;

    const colorStyle = {
      ...(accentColor
        ? {
            ["--accent-color" as any]:
              accentColor === "transparent" ? accentColor : `${accentColor}25`,
          }
        : {}),
    };
    style = style ?? {};

    return (
      <div
        ref={rootDiv}
        onMouseLeave={(e) => {
          if (!dropTarget) return;
          e.preventDefault();
          setShowDropZone(0);
        }}
        onMouseMove={(e) => {
          if (!dropTarget) return;
          e.preventDefault();
          e.stopPropagation();
          const box = rootDiv.current.getBoundingClientRect();
          const posn = e.clientY - box.top;
          if (posn > box.height / 2) setShowDropZone(1);
          else setShowDropZone(-1);
        }}
        onMouseUp={(e) => {
          if (!dropTarget) return;
          e.preventDefault();
          onDrop(showDropZone);
          setShowDropZone(0);
        }}
      >
        {showDropZone === -1 && <div className={styles.dropZone} />}
        <div
          ref={ref}
          className={classNames(className, styles.card, {
            [styles.collapsed]: collapsed,
            [styles.dragging]: dragging,
            [styles.dirty]: dirty,
            [styles.column]: mode === "column",
            [styles.window]: mode === "window",
            [styles.dragHelper]: dragHelper,
          })}
          style={{
            ...style,
            ...colorStyle,
            top: y,
            left: x,
            width: width,
            height: height,
          }}
          {...props}
        >
          <Popup
            disabled={collapsed || dragHelper || !setColor}
            className="up"
            on="right-click"
            keepTooltipInside
            onClose={() => setPreviewColor(undefined)}
            trigger={
              <header
                draggable
                onMouseDown={() => (mouseDown.current = true)}
                onMouseUp={() => {
                  if (!mouseDown.current || !collapsed || !setCollapsed) return;
                  setCollapsed(false);
                  mouseDown.current = false;
                }}
                onDragStart={(e) => {
                  e.preventDefault();
                  if (!dragHelper) setDragging(true);
                }}
              >
                <span className={styles.icon}>{icon}</span>
                <div className={styles.title}>{title}</div>
                {!collapsed && !dragHelper && (
                  <div className={styles.headerOptions}>{header}</div>
                )}
                {!dragHelper &&
                  setCollapsed &&
                  (collapsed ? (
                    <ChevronDown className={styles.collapse} />
                  ) : (
                    <ChevronUp
                      className={styles.collapse}
                      onClick={() => setCollapsed(true)}
                    />
                  ))}
              </header>
            }
          >
            <div
              className="popup-tooltip"
              onMouseLeave={() => setPreviewColor(undefined)}
            >
              <div className={styles.colorPicker}>
                {colors.map((c) => (
                  <div
                    key={c}
                    style={{ background: c }}
                    className={classNames({
                      [styles.active]: c === color,
                      [styles.transparent]: c === "transparent",
                    })}
                    onClick={() => setColor(c)}
                    onMouseEnter={() => setPreviewColor(c)}
                  />
                ))}
              </div>
            </div>
          </Popup>
          {!collapsed && !dragHelper && <main>{children}</main>}
        </div>
        {showDropZone === 1 && <div className={styles.dropZone} />}
      </div>
    );
  }
);

Card.displayName = "Card";
