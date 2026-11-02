const SMALL = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab", "Neel"];

function underThousand(value) {
  const words = [];
  if (value >= 100) {
    words.push(SMALL[Math.floor(value / 100)], "Hundred");
    value %= 100;
  }
  if (value >= 20) {
    words.push(TENS[Math.floor(value / 10)]);
    value %= 10;
  }
  if (value > 0) words.push(SMALL[value]);
  return words.join(" ");
}

function indianIntegerToWords(value) {
  let remaining = Math.floor(value);
  if (remaining === 0) return "Zero";

  const parts = [];
  let group = 0;
  while (remaining > 0) {
    const divisor = group === 0 ? 1000 : 100;
    const chunk = remaining % divisor;
    remaining = Math.floor(remaining / divisor);
    if (chunk > 0) {
      const scale = SCALES[group] || "";
      parts.unshift(`${underThousand(chunk)}${scale ? ` ${scale}` : ""}`);
    }
    group += 1;
  }
  return parts.join(" ");
}

export function amountInIndianWords(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Zero Rupees Only";

  const paiseTotal = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  const sign = amount < 0 ? "Minus " : "";
  const rupeeWords = `${indianIntegerToWords(rupees)} Rupees`;
  const paiseWords = paise ? ` and ${indianIntegerToWords(paise)} Paise` : "";
  return `${sign}${rupeeWords}${paiseWords} Only`;
}
