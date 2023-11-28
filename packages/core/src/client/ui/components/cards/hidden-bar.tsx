import classNames from "classnames";
import React, { useRef, useState } from "react";
import { CardDefinition, CardMap } from ".";

import styles from "./style.scss";

export function HiddenBar({
  colors,
  cards,
  hidden,
  onExpand,
  dragging,
  setDragging,
  dropTarget,
  onDrop,
  hide,
}: {
  colors: { [id: string]: string };
  cards: CardMap;
  hidden: string[];
  onExpand: (id: string) => void;
  dragging?: CardDefinition;
  setDragging?: (c: CardDefinition) => void;
  dropTarget?: boolean;
  onDrop?: () => void;
  hide?: boolean;
}) {
  const parent = useRef<HTMLDivElement>();
  const [showDropZone, setShowDropZone] = useState(false);

  return (
    <div
      ref={parent}
      className={classNames(styles.hiddenBar, {
        [styles.dragging]: dragging,
        [styles.hide]: hide,
      })}
      onWheel={(e) => {
        // Convert vertical scrolling into horizontal scrolling.)
        const target = e.target as HTMLDivElement;
        target.scrollTo({
          top: 0,
          left: target.scrollLeft + e.deltaY + e.deltaX,
        });
      }}
      onMouseOver={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setShowDropZone(true);
      }}
      onMouseOut={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setShowDropZone(false);
      }}
      onMouseUp={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setShowDropZone(false);
        onDrop();
      }}
    >
      {showDropZone && <div className={styles.dropZone} />}
      {hidden.map((id) => {
        const card = cards.get(id);
        return (
          <card.component
            key={id}
            color={colors[id]}
            mode="collapsed"
            setCollapsed={() => !dragging && onExpand(id)}
            dragging={dragging === card}
            setDragging={(d) => setDragging(d ? card : undefined)}
          />
        );
      })}
    </div>
  );
}
