import { describe, it, expect } from 'vitest';
import { markCommand, markAllCommand, execute, undo, record, stepBack, stepForward, emptyHistory, type Marks } from './attendance-commands';

describe('attendance commands', () => {
  it('execute then undo returns the exact previous marks', () => {
    const before: Marks = { 1: 'present' };
    const cmd = markCommand(before, 2, 'absent');
    const after = execute(before, cmd);
    expect(after).toEqual({ 1: 'present', 2: 'absent' });
    expect(undo(after, cmd)).toEqual(before);
  });

  it('undoing mark-all restores individual marks', () => {
    const before: Marks = { 1: 'absent', 2: 'late' };
    const cmd = markAllCommand(before, [1, 2, 3], 'present');
    expect(execute(before, cmd)).toEqual({ 1: 'present', 2: 'present', 3: 'present' });
    expect(undo(execute(before, cmd), cmd)).toEqual(before);
  });

  it('never mutates its input', () => {
    const before = Object.freeze({ 1: 'present' }) as Marks;
    expect(() => execute(before, markCommand(before, 1, 'late'))).not.toThrow();
  });

  it('history: recording clears redo, undo/redo walk the stack', () => {
    const a = markCommand({}, 1, 'late');
    const b = markCommand({}, 2, 'late');
    let h = record(record(emptyHistory, a), b);
    const back = stepBack(h);
    expect(back.cmd).toBe(b);
    h = back.history;
    expect(stepForward(h).cmd).toBe(b);
    expect(record(h, a).future).toEqual([]);
  });
});
