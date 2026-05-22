import { showAppAlert } from "./appAlert.js";

/** @param {'pending'|'confirmed'|string|undefined} status */
export function reserveSuccessMessage(status) {
  if (status === "confirmed") {
    return "Резервацията е потвърдена успешно.";
  }
  return "Резервацията е изпратена и чака потвърждение от администратор.";
}

/** @returns {Promise<boolean>} */
export function confirmReserve() {
  return showAppAlert({
    title: "Резервация",
    message: "Потвърждавате ли резервацията за този час?",
    confirmLabel: "Потвърди",
    cancelLabel: "Отказ",
    showCancel: true,
  });
}

/** @returns {Promise<boolean>} */
export function confirmWaitlistJoin() {
  return showAppAlert({
    title: "Списък за чакане",
    message: "Потвърждавате ли запис в списъка за чакащи?",
    confirmLabel: "Потвърди",
    cancelLabel: "Отказ",
    showCancel: true,
  });
}

/** @param {'pending'|'confirmed'|string|undefined} status */
export function alertAfterReserve(status) {
  return showAppAlert({
    title: "Резервация",
    message: reserveSuccessMessage(status),
    confirmLabel: "OK",
    showCancel: false,
  });
}

/** @param {string} message */
export function alertMessage(message, title = "Съобщение") {
  return showAppAlert({
    title,
    message,
    confirmLabel: "OK",
    showCancel: false,
  });
}

/** @param {string} message */
export function alertError(message) {
  return showAppAlert({
    title: "Грешка",
    message: message || "Възникна грешка. Опитайте отново.",
    confirmLabel: "OK",
    showCancel: false,
  });
}
