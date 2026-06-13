/**
 * @typedef {{
 *   title?: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   showCancel?: boolean,
 *   showInput?: boolean,
 *   inputLabel?: string,
 *   inputPlaceholder?: string,
 *   confirmVariant?: "primary" | "danger",
 * }} AppAlertOptions
 */

/**
 * @typedef {{ confirmed: boolean, inputValue?: string }} AppAlertResult
 */

/** @type {((state: AppAlertOptions & { resolve: (result: AppAlertResult) => void } | null) => void) | null} */
let notify = null;

/** @param {typeof notify} fn */
export function registerAppAlertNotifier(fn) {
  notify = fn;
}

/**
 * @param {AppAlertOptions} options
 * @returns {Promise<boolean|string|null>} confirmed without input; input value or null when cancelled with `showInput`
 */
export function showAppAlert(options) {
  return new Promise((resolve) => {
    if (!notify) {
      window.alert(options.message);
      resolve(options.showInput ? "" : true);
      return;
    }
    notify({
      title: options.title ?? "Съобщение",
      message: options.message,
      confirmLabel: options.confirmLabel ?? "OK",
      cancelLabel: options.cancelLabel ?? "Отказ",
      showCancel: options.showCancel !== false,
      showInput: options.showInput ?? false,
      inputLabel: options.inputLabel ?? "",
      inputPlaceholder: options.inputPlaceholder ?? "",
      confirmVariant: options.confirmVariant ?? "primary",
      resolve: (result) => {
        if (options.showInput) {
          resolve(result.confirmed ? (result.inputValue ?? "") : null);
        } else {
          resolve(result.confirmed);
        }
      },
    });
  });
}
