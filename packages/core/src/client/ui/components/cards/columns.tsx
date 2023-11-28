import {
  useBeforeMount,
  useLocalStorageState,
} from "../../../../client/support/hooks";
import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { CardDefinition, CardHostHandle, CardMap } from ".";
import { HiddenBar } from "./hidden-bar";

import styles from "./style.scss";

function Column({
  children,
  dropTarget,
  onDrop,
}: {
  children: React.ReactNode;
  dropTarget?: boolean;
  onDrop?: () => void;
}) {
  const ref = useRef();
  const [showDropZone, setShowDropZone] = useState(false);

  return (
    <div
      ref={ref}
      onMouseOver={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setShowDropZone(e.target === ref.current);
      }}
      onMouseOut={(e) => {
        if (!dropTarget) return;
        e.preventDefault();
        setShowDropZone(false);
      }}
      onMouseUp={(e) => {
        if (!dropTarget) return;
        if (e.target !== ref.current) return; // It's for a child.
        e.preventDefault();
        setShowDropZone(false);
        onDrop();
      }}
    >
      {children}
      {showDropZone && <div className={styles.dropZone} />}
    </div>
  );
}

export const ColumnCardHost = forwardRef<
  CardHostHandle,
  { cards: CardMap; prefix: string }
>(({ cards, prefix }, ref) => {
  const [dragging, setDragging] = useState<CardDefinition>();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Listen to document mouse events so everything feels nice.
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      setMousePos({
        x: e.pageX,
        y: e.pageY,
      });
    }
    function onMouseUp(e: MouseEvent) {
      if (dragging) {
        e.preventDefault();
        setDragging(undefined);
      }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  const [columnMap, setColumnMap] = useLocalStorageState<{
    [id: string]: number;
  }>(`${prefix}--column-map`, {});

  const [colors, setColors] = useLocalStorageState<{ [id: string]: string }>(
    `${prefix}--colors`,
    {}
  );

  const [_visible, setVisible] = useLocalStorageState<string[]>(
    `${prefix}--column-visible`,
    Array.from(cards.values()).map((c) => c.id)
  );
  const [_hidden, setHidden] = useLocalStorageState<string[]>(
    `${prefix}--column-hidden`,
    []
  );
  let [visible, hidden] = [_visible, _hidden];

  const cardRefs = useRef<{ [id: string]: HTMLDivElement }>({}).current;
  const [_jumpTo, _setJumpTo] = useState<string>();

  useBeforeMount(() => {
    const cardSet = new Set(Array.from(cards.values()).map((c) => c.id));

    // Remove any cards that aren't in the list any more.
    (visible = visible.filter((id) => cardSet.has(id))),
      (hidden = hidden.filter((id) => cardSet.has(id)));

    // Add all unknown (new) cards to visible.
    const known = new Set(visible.concat(hidden));
    cardSet.forEach((id) => !known.has(id) && visible.push(id));

    setVisible(visible);
    setHidden(hidden);
  });

  /**
   * Move a card to a new position (relative position and column). Also reveals
   * the card if it was hidden.
   */
  const moveCard = (
    id: string,
    { i, column }: { i?: number; column?: number } = {}
  ) => {
    let toMove = visible.indexOf(id);
    if (toMove === -1) {
      // Card is hidden. We reveal and insert it.
      setHidden((hidden = [...hidden.filter((h) => h != id)]));
      visible.push(id);
      toMove = visible.length - 1;
      setVisible([...visible]);
    }

    if (column !== undefined) setColumnMap({ ...columnMap, [id]: column });
    if (i !== undefined) {
      if (i > toMove) i--;
      setVisible(
        (visible.splice(i, 0, visible.splice(toMove, 1)[0]), [...visible])
      );
    }
  };

  /**
   * Collapse a card.
   */
  const hideCard = (id: string) => {
    setVisible([...visible.filter((i) => i !== id)]);
    setHidden([id, ...hidden]);
    delete columnMap[id];
    setColumnMap({ ...columnMap });
  };

  /**
   * Reveal card if hidden and bring it into view.
   */
  const jumpTo = (id: string) => {
    // Reveal the card if necessary
    if (!visible.includes(id)) moveCard(id);
    _setJumpTo(id);
  };
  useLayoutEffect(() => {
    if (_jumpTo && cardRefs[_jumpTo]) {
      window.scrollTo({
        top:
          cardRefs[_jumpTo].getBoundingClientRect().top +
          window.pageYOffset -
          70,
        behavior: "smooth",
      });
      _setJumpTo(undefined);
    }
  }, [_jumpTo]);

  useImperativeHandle(
    ref,
    () => {
      return {
        visible,
        jumpTo,
        hideCard,
      };
    },
    [jumpTo, hideCard]
  );

  const columns = useMemo(() => {
    const cols: any[][] = [[], []];
    visible.forEach((id, i) => {
      const card = cards.get(id);
      const color = colors[card.id];

      if (columnMap[card.id] === undefined) {
        // No assigned column. Add it to the end of the shortest one.
        columnMap[card.id] = cols[0].length <= cols[1].length ? 0 : 1;
        setColumnMap({ ...columnMap });
      }

      const col = columnMap[card.id];
      cols[col].push(
        <card.component
          ref={(el) => (cardRefs[card.id] = el)}
          key={card.id}
          mode="column"
          setCollapsed={() => hideCard(id)}
          color={color}
          setColor={(c: string) => setColors({ ...colors, [card.id]: c })}
          dragging={dragging === card}
          setDragging={(d) => {
            if (d) setDragging(card);
            else setDragging(undefined);
          }}
          dropTarget={!!dragging}
          onDrop={(side) => {
            if (side === -1) moveCard(dragging.id, { i, column: col });
            else moveCard(dragging.id, { i: i + 1, column: col });
          }}
        />
      );
    });
    return cols;
  }, [visible, colors, dragging]);

  return (
    <>
      <div className={styles.columns}>
        {columns.map((col, i) => (
          <Column
            key={i}
            dropTarget={!!dragging}
            onDrop={() => {
              moveCard(dragging.id, { column: i, i: visible.length });
            }}
          >
            {col}
          </Column>
        ))}
      </div>
      <HiddenBar
        hide={!hidden.length}
        colors={colors}
        cards={cards}
        hidden={hidden}
        onExpand={(id) => jumpTo(id)}
        dragging={dragging}
        setDragging={setDragging}
        dropTarget={dragging && !hidden.includes(dragging.id)}
        onDrop={() => hideCard(dragging.id)}
      />
      {dragging && (
        <dragging.component
          mode="drag-helper"
          color={colors[dragging.id]}
          {...mousePos}
        />
      )}
    </>
  );
});
ColumnCardHost.displayName = "ColumnCardHost";
