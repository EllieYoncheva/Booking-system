import { useEffect, useState } from "react";
import { registerAppAlertNotifier } from "../utils/appAlert.js";

export default function AppAlertHost() {
  /** @type {[null | import("../utils/appAlert.js").AppAlertOptions & { resolve: (v: boolean) => void }]} */
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    registerAppAlertNotifier(setAlert);
    return () => registerAppAlertNotifier(null);
  }, []);

  if (!alert) return null;

  const close = (confirmed) => {
    const resolve = alert.resolve;
    setAlert(null);
    resolve(confirmed);
  };

  return (
    <div
      className="modal-backdrop app-alert-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-alert-title"
      aria-describedby="app-alert-message"
    >
      <div className="panel modal-card app-alert-card">
        <h4 id="app-alert-title">{alert.title}</h4>
        <p id="app-alert-message" className="app-alert-message">
          {alert.message}
        </p>
        <div className="app-alert-actions">
          {alert.showCancel && (
            <button type="button" onClick={() => close(false)}>
              {alert.cancelLabel}
            </button>
          )}
          <button type="button" className="primary" onClick={() => close(true)}>
            {alert.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
