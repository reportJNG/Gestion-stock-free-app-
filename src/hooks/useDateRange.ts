import { useMemo } from 'react';

export type Period = 'today' | 'week' | 'month' | 'last30' | 'custom';
export interface DateRange {
  start: string;
  end: string;
}

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const sqlDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const previousRange = (range: DateRange): DateRange => {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start: sqlDate(prevStart), end: sqlDate(prevEnd) };
};

export const useDateRange = (period: Period, custom: { start: string; end: string }) =>
  useMemo<DateRange>(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    if (period === 'week') {
      start = startOfDay(new Date(now));
      start.setDate(now.getDate() - now.getDay());
    } else if (period === 'month') {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (period === 'last30') {
      start = startOfDay(new Date(now));
      start.setDate(now.getDate() - 29);
    } else if (period === 'custom') {
      start = startOfDay(new Date(custom.start));
      end = endOfDay(new Date(custom.end));
    }

    return { start: sqlDate(start), end: sqlDate(end) };
  }, [custom.end, custom.start, period]);
