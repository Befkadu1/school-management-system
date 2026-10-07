import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualList } from './VirtualList';

describe('VirtualList', () => {
  it('renders only the visible rows plus overscan, not all 10,000', () => {
    const items = Array.from({ length: 10_000 }, (_, i) => i);
    render(<VirtualList label="Numbers" items={items} rowHeight={40} height={400} overscan={5} getKey={(i) => i} renderRow={(i) => <span>Row {i}</span>} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBe(15); // 10 visible + 5 overscan below
    expect(screen.queryByText('Row 9999')).toBeNull();
  });
});
