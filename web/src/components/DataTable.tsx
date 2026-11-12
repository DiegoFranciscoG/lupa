import type {ReactNode} from 'react';
import {Table} from '@astryxdesign/core/Table';
import type {Row} from '../lib/db';

export interface Column {
  key: string;
  header: string;
  align?: 'start' | 'end';
  render?: (row: Row) => ReactNode;
}

/** Thin wrapper over the Astryx Table with stable row ids and right-aligned figures. */
export function DataTable({rows, columns}: {rows: Row[]; columns: Column[]}) {
  const data: Row[] = rows.map((r, i) => ({...r, __id: i}));
  return (
    <div className="lupa-table-wrap">
      <Table<Row>
        data={data}
        idKey="__id"
        density="compact"
        columns={columns.map((c) => ({
          key: c.key,
          header: c.header,
          align: c.align === 'end' ? 'end' : 'start',
          renderCell: (item: Row) => (c.render ? c.render(item) : String(item[c.key] ?? 'sin dato')),
        }))}
      />
    </div>
  );
}
