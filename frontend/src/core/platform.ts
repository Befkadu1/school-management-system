import type { AppStore } from '../store';
import type { SchoolApi } from '../api/schoolApi';
import type { CommandBus } from './commandBus';
import type { ViewFactoryRegistry } from './viewFactoryRegistry';

/**
 * Service locator. Everything the app registers at start-up is looked up here
 * by name, so a page or a handler depends on an interface rather than on the
 * module that happens to create the thing.
 */
export const ServiceName = {
  CommandBus: 'commandBus',
  ViewFactoryRegistry: 'viewFactoryRegistry',
  Store: 'store',
  Api: 'api',
} as const;
export type ServiceName = (typeof ServiceName)[keyof typeof ServiceName];

export interface Services {
  [ServiceName.CommandBus]: CommandBus;
  [ServiceName.ViewFactoryRegistry]: ViewFactoryRegistry;
  [ServiceName.Store]: AppStore;
  [ServiceName.Api]: SchoolApi;
}

export class Platform {
  private services = new Map<ServiceName, unknown>();

  public register<N extends ServiceName>(name: N, service: Services[N]): void {
    this.services.set(name, service);
  }

  public has(name: ServiceName): boolean {
    return this.services.has(name);
  }

  public get<N extends ServiceName>(name: N): Services[N] {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service '${name}' is not registered`);
    return service as Services[N];
  }
}
