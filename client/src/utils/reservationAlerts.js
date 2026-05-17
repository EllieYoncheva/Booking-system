/** @param {'pending'|'confirmed'|string|undefined} status */
export function alertAfterReserve(status) {
  if (status === "confirmed") {
    window.alert("Резервацията е потвърдена успешно.");
    return;
  }
  window.alert("Резервацията е изпратена и чака потвърждение от администратор.");
}
