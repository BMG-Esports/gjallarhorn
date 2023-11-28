import { ComponentPropsWithoutRef, ComponentType, RefAttributes } from "react";

export type CardProps = ComponentPropsWithoutRef<"div"> &
  RefAttributes<HTMLDivElement> & {
    /** Triggered when the user collapses or expands the card. */
    setCollapsed?: (collapsed: boolean) => void;

    /** Card accent color. */
    color?: string;
    /** Triggered when the user changes the card's color. */
    setColor?: (c: string) => void;

    /** Mark the card as being dragged around. This dims the card. */
    dragging?: boolean;
    /** Triggered when user starts a drag from the card's header. */
    setDragging?: (dragging: boolean) => void;

    /**
     * Mark the card as a drop target.
     * The card will start responding to mouse events and show a drop zone hint.
     */
    dropTarget?: boolean;
    /**
     * Triggered when dropTarget is true and a mouse-up event occurs on the card.
     * @param side 1 if dropped on bottom half, -1 if on top half.
     */
    onDrop?: (side: number) => void;

    /** Passed into style.left of root div. */
    x?: number;

    /** Passed into style.right of root div. */
    y?: number;

    /** Passed into style.width of root div. */
    width?: number;

    /** Passed into style.height of root div. */
    height?: number;

    /** Render mode for card. */
    mode: "window" | "column" | "collapsed" | "drag-helper";

    /** Class name for root div. */
    className?: string;
  };

export type CardDefinition = {
  /**
   * Unique identifier for the card.
   */
  id: string;

  /**
   * User-friendly card name.
   */
  title: string;

  /**
   * Minimum width of card, in pixels.
   */
  width?: number;

  /**
   * Minimum height of card, in pixels.
   */
  height?: number;

  /**
   * Actual component to render. Should accept CardProps and render a Card.
   */
  component: ComponentType<CardProps>;
};

export type CardMap = Map<string, CardDefinition>;

/**
 * The imperative functionality that is exposed by each host.
 */
export type CardHostHandle = {
  jumpTo: (id: string) => void;
  hideCard: (id: string) => void;
};
