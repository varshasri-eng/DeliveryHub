export function formatMoney(amount, currencyCode = "USD") {
  if (amount === null || amount === undefined || amount === "") {
    return `${currencyCode} price not set`;
  }

  return new Intl.NumberFormat(currencyCode === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
