export const exceptionDetail = (item: {
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}): string | null => {
  if (!item.fullDay && (!item.startTime || !item.endTime)) return null;
  const span = item.fullDay ? 'Dia inteiro' : `${item.startTime}–${item.endTime}`;
  const reason = item.reason?.trim();
  return reason ? `${reason} · ${span}` : span;
};
