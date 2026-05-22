/**
 * @typedef {{
 *   title?: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   showCancel?: boolean,
 * }} AppAlertOptions
 */

/** @type {((state: AppAlertOptions & { resolve: (confirmed: boolean) => void } | null) => void) | null} */
let notify = null;

/** @param {typeof notify} fn */
export function registerAppAlertNotifier(fn) {
  notify = fn;
}

/**
 * @param {AppAlertOptions} options
 * @returns {Promise<boolean>} true if confirmed (OK), false if cancelled
 */
export function showAppAlert(options) {
  return new Promise((resolve) => {
    if (!notify) {
      window.alert(options.message);
      resolve(true);
      return;
    }
    notify({
      title: options.title ?? "Съобщение",
      message: options.message,
      confirmLabel: options.confirmLabel ?? "OK",
      cancelLabel: options.cancelLabel ?? "Отказ",
      showCancel: options.showCancel !== false,
      resolve,
    });
  });
}
