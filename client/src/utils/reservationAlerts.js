import { showAppAlert } from "./appAlert.js";

/** @param {'pending'|'confirmed'|string|undefined} status */
export function reserveSuccessMessage(status) {
  if (status === "confirmed") {
    return "Резервацията е потвърдена успешно.";
  }
  return "Вашата заявка ще бъде изпратена за потвърждение. След одобрение мястото ви в класа ще бъде запазено.";
}

/** @returns {Promise<boolean>} */
export function confirmReserve() {
  return showAppAlert({
    title: "Резервация",
    message:
      "Сигурни ли сте, че желаете да запазите място за този клас? Отказ от резервация е възможен до 3 часа преди началото на класа.",
    confirmLabel: "Потвърди",
    cancelLabel: "Отказ",
    showCancel: true,
  });
}

/** @returns {Promise<boolean>} */
export function confirmWaitlistJoin() {
  return showAppAlert({
    title: "Списък за чакане",
    message:
      "В момента няма свободни места. Желаете ли да се запишете в списъка на чакащи? При освобождаване на място ще бъдете уведомени.",
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
