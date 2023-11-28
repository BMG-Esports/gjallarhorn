import { lazy } from "react";

export type Page = {
  title: string;
  slug: string;
  scope: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
};

export const pages: Page[] = [
  {
    title: "Tournament",
    slug: "/tournament",
    scope: "pages:tournament",
    component: "./tournament",
  },
].map((p) => ({
  ...p,
  component: lazy(
    () =>
      import(
        /* webpackInclude: /\.tsx$/ */
        /* webpackExclude: /cards/ */
        /* webpackChunkName: "pages/[request]" */
        `${p.component}`
      )
  ),
}));
