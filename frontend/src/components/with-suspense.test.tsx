import { describe, it, expect, vi, afterEach } from 'vitest';
import { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { withSuspense } from './with-suspense';

afterEach(() => vi.restoreAllMocks());

describe('withSuspense', () => {
  it('renders the page when it loads without errors', async () => {
    const Page = withSuspense(lazy(() => Promise.resolve({ default: () => <h2>Students</h2> })));
    render(<Page />);
    expect(await screen.findByRole('heading', { name: 'Students' })).toBeTruthy();
  });

  it('shows the loading fallback while the page chunk is still downloading', () => {
    const Page = withSuspense(lazy(() => new Promise<never>(() => {})));
    render(<Page />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('shows an alert with the error message instead of crashing the app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs caught errors; keep the test output quiet
    const Broken = () => { throw new Error('chunk 404'); };
    const Page = withSuspense(Broken);
    render(<Page />);
    expect(screen.getByRole('alert').textContent).toContain('chunk 404');
  });
});
