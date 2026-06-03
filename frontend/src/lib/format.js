// Currency: Philippine Peso (PHP). Single source of truth for formatting.
export const CURRENCY_CODE = "PHP";
export const CURRENCY_SYMBOL = "₱";

const _fmt = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(n) {
  return _fmt.format(Number(n) || 0);
}

export function formatPeso(n) {
  return `${CURRENCY_SYMBOL}${_fmt.format(Number(n) || 0)}`;
}
