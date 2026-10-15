export const formatMoney = n => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 2 }).format(n / 100) + ' ₸';
export function toMinor(value) {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;
  const result = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return result <= 10000000000 ? result : null;
}
export const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
