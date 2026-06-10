export function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = { DZD: 'DA ', USD: '$ ', EUR: '€ ', GBP: '£ ', MAD: 'MAD ', TND: 'TND ' };
  return map[code] || `${code} `;
}

export function formatCurrency(amount: number, currency: string): string {
  return `${getCurrencySymbol(currency)}${amount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
