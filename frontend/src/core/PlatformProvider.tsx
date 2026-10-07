import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ServiceName, type Platform } from './platform';
import type { Command, CommandBus } from './commandBus';
import type { ViewFactory } from './viewFactoryRegistry';

const PlatformContext = createContext<Platform | null>(null);

export const PlatformProvider = ({ platform, children }: { platform: Platform; children: ReactNode }) => (
  <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
);

export const usePlatform = (): Platform => {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error('usePlatform must be used inside a <PlatformProvider>');
  return platform;
};

export const useCommandBus = (): CommandBus => usePlatform().get(ServiceName.CommandBus);

/**
 * Fire-and-forget dispatch, for handlers that do not await a result. A failed
 * command is logged rather than left as an unhandled rejection; a page that
 * needs to show the error awaits useCommandBus().handle() instead.
 */
export const useCommand = (): ((command: Command) => void) => {
  const commandBus = useCommandBus();
  return useMemo(
    () => (command: Command) => { void commandBus.handle(command).catch((e: Error) => console.error(e)); },
    [commandBus],
  );
};

export const useViewFactory = <V, T>(name: string): ViewFactory<V, T> => {
  const registry = usePlatform().get(ServiceName.ViewFactoryRegistry);
  return useMemo(() => registry.getFactory<V, T>(name), [registry, name]);
};
