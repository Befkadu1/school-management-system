import type { AttendanceRecord } from './types.js';

export interface AttendanceSummary { present: number; late: number; absent: number; total: number; rate: number }

/** Late counts as attended. Rate is 0–1; 1 when there are no records yet. */
export const summarize = (records: readonly AttendanceRecord[]): AttendanceSummary => {
  const counts = records.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { present: 0, late: 0, absent: 0 },
  );
  const total = records.length;
  const rate = total === 0 ? 1 : (counts.present + counts.late) / total;
  return { ...counts, total, rate };
};

export const groupByStudent = (records: readonly AttendanceRecord[]): ReadonlyMap<number, AttendanceRecord[]> =>
  records.reduce((map, r) => map.set(r.studentId, [...(map.get(r.studentId) ?? []), r]), new Map<number, AttendanceRecord[]>());

export interface AttendanceRisk { studentId: number; summary: AttendanceSummary }

/** Students whose attendance rate is below the threshold, worst first. */
export const findAtRisk = (records: readonly AttendanceRecord[], threshold: number, minDays = 3): AttendanceRisk[] =>
  [...groupByStudent(records)]
    .map(([studentId, recs]) => ({ studentId, summary: summarize(recs) }))
    .filter((r) => r.summary.total >= minDays && r.summary.rate < threshold)
    .sort((a, b) => a.summary.rate - b.summary.rate);
