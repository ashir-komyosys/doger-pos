let defaultCurrency = "PKR";

export function setDefaultCurrency(currency: string) {
  defaultCurrency = currency.toUpperCase();
}

export function formatCurrency(
  value: number | string,
  currency = defaultCurrency,
  locale?: string,
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const resolvedLocale =
    locale ?? (currency === "PKR" ? "en-PK" : currency === "INR" ? "en-IN" : "en-US");

  if (currency === "PKR" || currency === "INR") {
    const formattedAmount = new Intl.NumberFormat(resolvedLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `Rs. ${formattedAmount}`;
  }

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
