import React, { forwardRef } from "react";

const StartGG = forwardRef<
  SVGSVGElement,
  {
    color?: string;
    size?: number | string;
  }
>(({ color = "currentColor", size = 24, ...rest }, ref) => (
  <svg
    ref={ref}
    version="1.1"
    id="start.gg_icon"
    xmlns="http://www.w3.org/2000/svg"
    x="0px"
    y="0px"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    {...rest}
  >
    <g>
      <path
        d="M0.772 11.988h4.496c0.415 0 0.748 -0.336 0.748 -0.748V6.742c0 -0.415 0.336 -0.748 0.748 -0.748h16.484c0.415 0 0.748 -0.336 0.748 -0.748V0.748C24 0.336 23.664 0 23.25 0H6.018C2.707 0 0.024 2.683 0.024 5.994v5.246C0.024 11.652 0.36 11.988 0.772 11.988z"
        fill={color}
      />
      <path
        d="M23.252 11.988H18.756c-0.415 0 -0.748 0.336 -0.748 0.748v4.496c0 0.415 -0.336 0.748 -0.748 0.748H0.774C0.36 17.982 0.024 18.318 0.024 18.73v4.496C0.024 23.64 0.36 23.976 0.774 23.976H18.006c3.311 0 5.994 -2.683 5.994 -5.994V12.736c0 -0.412 -0.336 -0.748 -0.748 -0.748z"
        fill={color}
      />
    </g>
  </svg>
));
StartGG.displayName = "StartGG";

export default StartGG;
