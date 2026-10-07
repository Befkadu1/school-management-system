/**
 * View factories turn a domain object into a view model for a generic
 * renderer, keyed by the kind of view ('list', 'card', …). A page asks the
 * registry for the factory it needs instead of hard-coding how a student or an
 * invoice looks, so a new view is one registration rather than a new component.
 */
export type ViewFactory<V, T> = (item: T) => V;

export class ViewFactoryRegistry {
  private factories = new Map<string, ViewFactory<unknown, never>>();

  public registerFactory<V, T>(name: string, factory: ViewFactory<V, T>): void {
    this.factories.set(name, factory as ViewFactory<unknown, never>);
  }

  public has(name: string): boolean {
    return this.factories.has(name);
  }

  public getFactory<V, T>(name: string): ViewFactory<V, T> {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`No view factory registered for '${name}'`);
    return factory as ViewFactory<V, T>;
  }

  public create<V, T>(name: string, item: T): V {
    return this.getFactory<V, T>(name)(item);
  }
}
