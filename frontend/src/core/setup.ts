import { CommandBus, logging } from './commandBus';
import { ViewFactoryRegistry } from './viewFactoryRegistry';
import { Platform, ServiceName } from './platform';
import {
  AttendanceHandler, MarkAttendanceCommand, MarkEveryoneCommand, RedoAttendanceCommand,
  SaveAttendanceCommand, SelectAttendanceContextCommand, UndoAttendanceCommand,
} from './commands/attendance';
import {
  CreateStudentCommand, CreateStudentHandler, FilterStudentsByClassCommand,
  SearchStudentsCommand, StudentListHandler,
} from './commands/students';
import {
  ClosePaymentDialogCommand, OpenPaymentDialogCommand, PaymentHandler, RecordPaymentCommand,
} from './commands/fees';
import { AskAssistantCommand, AssistantHandler, PublishDraftCommand } from './commands/assistant';
import { StudentListFactory } from '../features/students/factory';
import { InvoiceListFactory } from '../features/fees/factory';
import type { ViewFactory } from './viewFactoryRegistry';
import type { ListItem } from './views/types';
import type { Student } from '../api/types';
import type { InvoiceWithName } from '../store/feesSlice';
import { schoolApi, type SchoolApi } from '../api/schoolApi';
import type { AppStore } from '../store';

/**
 * The single place where the app is wired together. Commands, their handlers
 * and the view factories are registered here at start-up; nothing else in the
 * app knows which handler serves which command.
 */
export class Setup {
  constructor(private platform: Platform) {}

  public setup(): void {
    this.registerCommands();
    this.registerViewFactories();
  }

  private registerCommands(): void {
    this.registerAttendanceCommands();
    this.registerStudentCommands();
    this.registerFeeCommands();
    this.registerAssistantCommands();
  }

  private registerAttendanceCommands(): void {
    const handler = new AttendanceHandler(this.store);
    this.commandBus.register(SelectAttendanceContextCommand, handler);
    this.commandBus.register(MarkAttendanceCommand, handler);
    this.commandBus.register(MarkEveryoneCommand, handler);
    this.commandBus.register(UndoAttendanceCommand, handler);
    this.commandBus.register(RedoAttendanceCommand, handler);
    this.commandBus.register(SaveAttendanceCommand, handler);
  }

  private registerStudentCommands(): void {
    this.commandBus.register(CreateStudentCommand, new CreateStudentHandler(this.store));

    const listHandler = new StudentListHandler(this.store);
    this.commandBus.register(SearchStudentsCommand, listHandler);
    this.commandBus.register(FilterStudentsByClassCommand, listHandler);
  }

  private registerFeeCommands(): void {
    const handler = new PaymentHandler(this.store);
    this.commandBus.register(OpenPaymentDialogCommand, handler);
    this.commandBus.register(ClosePaymentDialogCommand, handler);
    this.commandBus.register(RecordPaymentCommand, handler);
  }

  private registerAssistantCommands(): void {
    const handler = new AssistantHandler(this.store);
    this.commandBus.register(AskAssistantCommand, handler);
    this.commandBus.register(PublishDraftCommand, handler);
  }

  /** Register all view factories provided by the features. */
  private registerViewFactories(): void {
    const studentListFactory = new StudentListFactory(this.platform);
    const invoiceListFactory = new InvoiceListFactory();

    const studentItemFactory: ViewFactory<ListItem, Student> = studentListFactory.create;
    const invoiceItemFactory: ViewFactory<ListItem, InvoiceWithName> = invoiceListFactory.create;

    this.viewFactoryRegistry.registerFactory('student-list', studentItemFactory);
    this.viewFactoryRegistry.registerFactory('invoice-list', invoiceItemFactory);
  }

  private get commandBus(): CommandBus {
    return this.platform.get(ServiceName.CommandBus);
  }

  private get viewFactoryRegistry(): ViewFactoryRegistry {
    return this.platform.get(ServiceName.ViewFactoryRegistry);
  }

  private get store(): AppStore {
    return this.platform.get(ServiceName.Store);
  }
}

/** Builds the platform, registers every service, and runs Setup once. */
export const createPlatform = (store: AppStore, api: SchoolApi = schoolApi): Platform => {
  const platform = new Platform();
  platform.register(ServiceName.Store, store);
  platform.register(ServiceName.Api, api);
  platform.register(ServiceName.CommandBus, new CommandBus(import.meta.env.DEV ? [logging()] : []));
  platform.register(ServiceName.ViewFactoryRegistry, new ViewFactoryRegistry());

  new Setup(platform).setup();
  return platform;
};
