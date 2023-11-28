import { useKeybind } from "../../../../client/support/hooks";
import classNames from "classnames";
import Fuse from "fuse.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Popup from "reactjs-popup";

import { CardDefinition } from ".";
import { Input } from "../../fields/input";

export const JumpTo = ({
  cards,
  jumpTo,
}: {
  cards: CardDefinition[];
  jumpTo: (id: string) => void;
}) => {
  const ref = useRef<HTMLInputElement>();
  const fuse = useMemo(
    () =>
      new Fuse(cards, {
        keys: ["id"],
        ignoreLocation: true,
        ignoreFieldNorm: true,
      }),
    [cards]
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [openPopup, setOpenPopup] = useState(false);

  // Reset selected and reopen popup whenever query changes.
  useEffect(() => (setSelected(0), setOpenPopup(true)), [query]);
  const matches = useMemo(() => fuse.search(query), [query]);
  function selectActive() {
    jumpTo(matches[selected].item.id);
    setQuery("");
  }

  useKeybind(
    () => {
      ref.current.focus();
    },
    "Slash",
    true,
    { alt: true }
  );

  return (
    <div>
      <Input
        ref={ref}
        value={query}
        onFocus={() => setOpenPopup(true)}
        onBlur={() => setOpenPopup(false)}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown")
            setSelected((selected + 1) % matches.length);
          if (e.key === "ArrowUp")
            setSelected(selected === 0 ? matches.length - 1 : selected - 1);
          if (e.key === "Enter" && matches.length)
            selectActive(), (e.target as HTMLInputElement).blur();
        }}
        placeholder="Jump To (Alt + /)"
        type="text"
        big
      />
      <Popup
        open={openPopup}
        onClose={() => setOpenPopup(false)}
        position={["bottom left", "bottom right"]}
        arrow={false}
        keepTooltipInside
        trigger={<div />}
      >
        {query && (
          <div className="popup-menu no-hover highlight-active">
            {matches.map((match, i) => (
              <div
                className={classNames({
                  active: i === selected,
                })}
                onMouseEnter={() => setSelected(i)}
                onClick={selectActive}
                key={match.item.id}
              >
                {match.item.title}
              </div>
            ))}
            {!matches.length && "No matches."}
          </div>
        )}
      </Popup>
    </div>
  );
};
