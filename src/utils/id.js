export function generateId(prefix = "REC") {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `${prefix}-${timestamp}-${randomPart}`;
}