import { describe, it, expect } from 'vitest';
import { summarize, findAtRisk } from './attendance.js';
import type { AttendanceRecord, AttendanceStatus } from './types.js';

const days = (studentId: number, statuses: AttendanceStatus[]): AttendanceRecord[] =>
  statuses.map((status, i) => ({ studentId, status, date: `2026-10-0${i + 1}` }));

describe('attendance', () => {
  it('counts late as attended', () => {
    expect(summarize(days(1, ['present', 'late', 'absent', 'present'])).rate).toBe(0.75);
  });

  it('treats no records as full attendance', () => {
    expect(summarize([]).rate).toBe(1);
  });

  it('finds at-risk students, worst first, ignoring students with too few days', () => {
    const records = [
      ...days(1, ['present', 'present', 'present', 'present']),
      ...days(2, ['absent', 'present', 'absent', 'present']),
      ...days(3, ['absent', 'absent', 'absent', 'present']),
      ...days(4, ['absent', 'absent']),
    ];
    expect(findAtRisk(records, 0.8).map((r) => r.studentId)).toEqual([3, 2]);
  });
});
