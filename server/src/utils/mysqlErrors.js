/** @param {unknown} err */
export function isDuplicateKeyError(err) {
  if (typeof err !== "object" || err === null) return false;
  return (
    ("code" in err && err.code === "ER_DUP_ENTRY") ||
    ("errno" in err && err.errno === 1062)
  );
}
