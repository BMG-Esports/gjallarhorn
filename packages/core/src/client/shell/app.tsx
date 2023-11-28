import React, { Suspense, useState, useEffect, Fragment } from "react";
import { Provider as InversifyProvider, useInjection } from "inversify-react";
import { ConduitProvider } from "react-conduit";
import {
  Route,
  Navigate,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { container } from "../support/di-container";
import { Page, pages } from "../pages";
import { Header } from "./header";
import styles from "./shell.scss";
import { useTitle } from "../support/hooks";
import { SocketService } from "../services/socket";
import { StatusService } from "../services/status";
import { NotificationContainer } from "./notifications";

function PageWrapper({ page, onActive }: { page: Page; onActive: () => void }) {
  useEffect(() => {
    onActive();
  }, [onActive]);
  useTitle(page.title);
  return <page.component />;
}

function pageRoute({
  page,
  setActive,
}: {
  page: Page;
  setActive: (page: Page) => void;
}) {
  return (
    <Route
      key={page.slug}
      path={page.slug}
      element={<PageWrapper page={page} onActive={() => setActive(page)} />}
    />
  );
}

export function _App() {
  // Initialize the status service
  useInjection(StatusService);

  const [active, setActive] = useState<Page>(null);
  const socket = useInjection(SocketService);
  const scopedPages = pages;

  useEffect(() => socket.initialize(), []);

  return (
    <>
      <div className={styles.app}>
        {<Header pages={scopedPages} active={active} />}
        <div>
          <Suspense fallback={<div />}>
            <Routes>
              {scopedPages.length && (
                <>
                  <Route
                    path="/"
                    element={<Navigate replace to={scopedPages[0].slug} />}
                  />
                  {scopedPages.map((page) => pageRoute({ page, setActive }))}
                </>
              )}
            </Routes>
          </Suspense>
        </div>
      </div>
      <NotificationContainer />
    </>
  );
}

export function App() {
  return (
    <ConduitProvider>
      <InversifyProvider container={container}>
        <Router>
          <_App />
        </Router>
      </InversifyProvider>
    </ConduitProvider>
  );
}
