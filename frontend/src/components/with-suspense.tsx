import { Component, Suspense, type ComponentType, type ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    return this.state.error
      ? <p className="error" role="alert">This page failed to load: {this.state.error.message}. Reload to try again.</p>
      : this.props.children;
  }
}

/**
 * Higher-order component (the decorator pattern for components): wraps any page
 * in an error boundary and a loading fallback. Used with React.lazy so each page
 * is downloaded only when first opened (code splitting).
 */
export const withSuspense = <P extends object>(Page: ComponentType<P>, fallback: ReactNode = <p className="muted">Loading…</p>) => {
  const Wrapped = (props: P) => (
    <ErrorBoundary>
      <Suspense fallback={fallback}><Page {...props} /></Suspense>
    </ErrorBoundary>
  );
  Wrapped.displayName = `withSuspense(${Page.displayName ?? Page.name ?? 'Page'})`;
  return Wrapped;
};
