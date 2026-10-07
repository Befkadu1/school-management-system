import { memo } from 'react';
import { useCommand } from '../PlatformProvider';
import type { ListItem } from './types';

interface Props {
  item: ListItem;
  /** CSS grid template, so each page keeps control of its own columns. */
  columns: string;
  /** Reserve a trailing cell for the action button, even on rows without one. */
  withAction?: boolean;
}

/** Renders whatever a view factory produced. It knows nothing about students or invoices. */
export const ListRow = memo(({ item, columns, withAction = false }: Props) => {
  const run = useCommand();
  const action = item.action;

  return (
    <div className="ruled-row" style={{ gridTemplateColumns: columns }} aria-label={item.label}>
      {item.columns.map((column, i) => <span key={i} className={column.className}>{column.text}</span>)}
      {withAction && (
        <span>
          {action && <button className="btn" onClick={() => run(action.command)}>{action.label}</button>}
        </span>
      )}
    </div>
  );
});
