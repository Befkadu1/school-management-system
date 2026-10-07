import { memo, useCallback, useRef, useState, type ReactNode, type UIEvent } from 'react';

interface Props<T> {
  items: readonly T[];
  rowHeight: number;
  height: number;
  overscan?: number;
  getKey: (item: T) => string | number;
  renderRow: (item: T, index: number) => ReactNode;
  label: string;
}

/**
 * Performance: renders only the rows in view (plus a few extra), so a list of
 * thousands of students stays fast. Scroll updates are batched with requestAnimationFrame.
 */
function VirtualListInner<T>({ items, rowHeight, height, overscan = 6, getKey, renderRow, label }: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrollTop(top));
  }, []);

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  const visible = items.slice(first, last);

  return (
    <div role="list" aria-label={label} onScroll={onScroll} style={{ height, overflowY: 'auto', position: 'relative' }}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${first * rowHeight}px)` }}>
          {visible.map((item, i) => (
            <div role="listitem" key={getKey(item)}>{renderRow(item, first + i)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;
