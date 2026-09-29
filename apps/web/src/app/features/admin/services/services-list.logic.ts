export const serviceListMeta = (durationMinutes: number, price: number): string | null => {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${durationMinutes} min · ${formatted}`;
};
