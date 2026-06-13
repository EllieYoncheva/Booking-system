import { useEffect, useState } from "react";
import { registerAppAlertNotifier } from "../utils/appAlert.js";

export default function AppAlertHost() {
  /** @type {[null | import("../utils/appAlert.js").AppAlertOptions & { resolve: (v: import("../utils/appAlert.js").AppAlertResult) => void }]} */
  const [alert, setAlert] = useState(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    registerAppAlertNotifier((next) => {
      setInputValue("");
      setAlert(next);
    });
    return () => registerAppAlertNotifier(null);
  }, []);

  if (!alert) return null;

  const close = (confirmed) => {
    const resolve = alert.resolve;
    setAlert(null);
    resolve({ confirmed, inputValue: alert.showInput ? inputValue : undefined });
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
        {alert.showInput && (
          <label className="app-alert-input-label">
            {alert.inputLabel}
            <textarea
              className="app-alert-input"
              rows={3}
              value={inputValue}
              placeholder={alert.inputPlaceholder}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </label>
        )}
        <div className="app-alert-actions">
          {alert.showCancel && (
            <button type="button" onClick={() => close(false)}>
              {alert.cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={alert.confirmVariant === "danger" ? "danger" : "primary"}
            onClick={() => close(true)}
          >
            {alert.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
