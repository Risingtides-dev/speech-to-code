'use client';

import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  sortable?: boolean;
}

export function DataTable({ columns, rows, sortable }: DataTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-muted/50 border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-muted-foreground',
                    sortable && 'cursor-pointer hover:text-foreground'
                  )}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className="hover:bg-muted/30 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {String(row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        {rows.length} {rows.length === 1 ? 'row' : 'rows'}
      </div>
    </div>
  );
}
