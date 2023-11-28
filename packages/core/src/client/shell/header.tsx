import { useAuth0 } from "@auth0/auth0-react";
import React, { useEffect, useState } from "react";
import { Menu, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import Popup from "reactjs-popup";
import { Page } from "../pages";
import { _NavOutlet } from "./nav";
import styles from "./shell.scss";
import { useLocalStorageState } from "../support/hooks";
import { Input } from "../ui/fields/input";
import { useInjection } from "inversify-react";
import { ShellService } from "../services/shell";

const times = [
  [17, "evening"],
  [12, "afternoon"],
  [0, "morning"],
];

const LightModeToggle = ({
  lightMode,
  setLightMode,
}: {
  lightMode: boolean;
  setLightMode: (b: boolean) => void;
}) => {
  return (
    <Input
      type="checkbox"
      label="Light Mode"
      checked={lightMode}
      onChange={(e) => {
        setLightMode(e.target.checked);
      }}
    />
  );
};

export function Header({
  pages,
  active,
}: {
  pages: Page[];
  active: Page | null;
}) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth0();

  const getToD = () => {
    const h = new Date().getHours();
    return times.find(([t]) => Number(t) <= h)?.[1];
  };

  const [lightMode, setLightMode] = useLocalStorageState(
    "shell--light-mode",
    false
  );
  useEffect(() => {
    if (lightMode) {
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    } else {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    }
  }, [lightMode]);

  const [notifications, setNotifications] = useLocalStorageState(
    "shell--notifications",
    Notification.permission === "granted"
  );

  useEffect(() => {
    Notification.permission !== "granted" && setNotifications(false);
  }, []);

  const requestPermission = async () => {
    setNotifications(true);
    const state = await Notification.requestPermission();
    if (state !== "granted") setNotifications(false);
  };

  const shell = useInjection(ShellService);

  useEffect(() => {
    if (!notifications) return;
    const sub = shell.notifications$.subscribe((n) => {
      new Notification(n.source, {
        body: n.message,
        icon: "../favicon.png",
      });
    });
    return () => sub.unsubscribe();
  }, [notifications, shell]);

  return (
    <div className={styles.header}>
      <Popup
        open={open}
        trigger={
          <div className={styles.title}>
            <Menu />
            {active?.title && <span>{active?.title}</span>}
          </div>
        }
        position="bottom left"
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        arrow={false}
      >
        <div className="popup-menu">
          {pages.map((page) => (
            <NavLink
              key={page.slug}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
              to={page.slug}
            >
              {page.title}
            </NavLink>
          ))}
        </div>
      </Popup>
      <_NavOutlet className={styles.nav} />
      <Popup
        on="hover"
        trigger={
          <div className={styles.profile}>
            {user?.picture ? (
              <img src={user?.picture} alt={user.name} />
            ) : (
              <User />
            )}
          </div>
        }
        position="bottom right"
        arrow={false}
      >
        <div className={styles.profilePopup}>
          <span>Good {getToD()}!</span>
          <div
            style={{
              margin: "6px 0 10px",
              display: "flex",
            }}
          >
            <LightModeToggle {...{ lightMode, setLightMode }} />
          </div>
          <div
            style={{
              margin: "6px 0 10px",
              display: "flex",
            }}
          >
            <Input
              type="checkbox"
              label="Push Notifications"
              checked={notifications}
              onChange={(e) =>
                e.target.checked ? requestPermission() : setNotifications(false)
              }
            />
          </div>
        </div>
      </Popup>
    </div>
  );
}
