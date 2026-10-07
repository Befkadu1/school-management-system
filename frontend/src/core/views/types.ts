import type { ReactNode } from 'react';
import type { Command } from '../commandBus';

/** What every list factory produces, and the only shape <ListRow> knows about. */
export interface ListColumn {
  text: ReactNode;
  /** 'num' right-aligns, 'muted' dims, 'status-*' colours the fee badges. */
  className?: string;
}

export interface ListItemAction {
  label: string;
  /** Fired on the command bus when the row's button is pressed. */
  command: Command;
}

export interface ListItem {
  key: string | number;
  label: string;
  columns: ListColumn[];
  action?: ListItemAction;
}
