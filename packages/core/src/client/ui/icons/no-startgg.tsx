import React, { forwardRef } from "react";

const NoStartGG = forwardRef<
  SVGSVGElement,
  {
    color?: string;
    size?: number | string;
  }
>(({ color = "currentColor", size = 24, ...rest }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="none"
    {...rest}
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M5.813 11.639H1.448a0.727 0.727 0 0 1 -0.726 -0.726V5.82c0 -0.826 0.172 -1.611 0.482 -2.322l5.336 5.548v1.868a0.726 0.726 0 0 1 -0.726 0.726Zm2.921 -5.82h14.535a0.726 0.726 0 0 0 0.726 -0.726V0.726C24 0.326 23.674 0 23.271 0H6.541c-0.993 0 -1.927 0.248 -2.745 0.686L8.734 5.82Z"
      fill={color}
    />
    <path
      x="52.8023"
      y="46.3371"
      width="1295.12"
      height="72.7921"
      fill={color}
      d="m1.265 1.062 20.898 21.73 -1.221 1.175L0.044 2.236l1.221 -1.175z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.674 17.456H1.45c-0.403 0.002 -0.729 0.328 -0.729 0.729v4.365a0.728 0.728 0 0 0 0.729 0.729h16.73c0.634 0 1.244 -0.101 1.815 -0.288L14.674 17.456Zm8.372 3.198c0.603 -0.917 0.954 -2.015 0.954 -3.195v-5.093a0.727 0.727 0 0 0 -0.726 -0.726h-4.365a0.726 0.726 0 0 0 -0.726 0.726v3.232l4.863 5.056Z"
      fill={color}
    />
  </svg>
));
NoStartGG.displayName = "NoStartGG";

export default NoStartGG;
