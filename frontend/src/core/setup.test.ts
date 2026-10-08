import { describe, expect, it } from 'vitest';
import { createPlatform } from './setup';
import { ServiceName } from './platform';
import { makeStore } from '../store';
import { MarkAttendanceCommand, SaveAttendanceCommand, UndoAttendanceCommand } from '../features/attendance';
import { OpenPaymentDialogCommand } from '../features/fees';
import { AskAssistantCommand } from '../features/assistant';
import { CreateStudentCommand } from '../features/students';
import type { SchoolApi } from '../api/school-api';
import type { Command, CommandType } from './command-bus';

const api = {} as SchoolApi;

describe('Setup', () => {
  it('registers a handler for every command the pages fire', () => {
    const bus = createPlatform(makeStore(api), api).get(ServiceName.CommandBus);

    const commands: CommandType<Command>[] = [MarkAttendanceCommand, SaveAttendanceCommand, UndoAttendanceCommand,
      CreateStudentCommand, OpenPaymentDialogCommand, AskAssistantCommand];

    for (const command of commands) {
      expect(bus.isSupported(command)).toBe(true);
    }
  });

  it('registers every view factory the pages ask for', () => {
    const registry = createPlatform(makeStore(api), api).get(ServiceName.ViewFactoryRegistry);

    expect(registry.has('student-list')).toBe(true);
    expect(registry.has('invoice-list')).toBe(true);
  });

  it('marks attendance through the bus, and undoes it', async () => {
    const store = makeStore(api);
    const bus = createPlatform(store, api).get(ServiceName.CommandBus);

    await bus.handle(new MarkAttendanceCommand(1, 'late'));
    expect(store.getState().attendance.marks).toEqual({ 1: 'late' });

    await bus.handle(new UndoAttendanceCommand());
    expect(store.getState().attendance.marks).toEqual({});
  });
});
