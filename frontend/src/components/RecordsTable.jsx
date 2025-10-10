import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/Table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '@/lib/utils';

export default function RecordsTable({ records }) {
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState('');

  const columns = useMemo(() => [
    {
      accessorKey: 'index',
      header: '#',
      cell: ({ getValue }) => (
        <div className="font-medium">{getValue() + 1}</div>
      )
    },
    {
      accessorKey: 'tipoDocumento',
      header: 'Tipo Doc',
      cell: ({ getValue }) => (
        <Badge variant="outline">{getValue()}</Badge>
      )
    },
    {
      accessorKey: 'numeroDocumento',
      header: 'Número Documento',
      cell: ({ getValue }) => (
        <div className="font-mono">{getValue()}</div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ getValue }) => {
        const status = getValue();
        const statusLabel = {
          success: 'Exitoso',
          failed: 'Fallido',
          processing: 'Procesando',
          pending: 'Pendiente',
          skipped: 'Omitido'
        };

        return (
          <Badge className={getStatusColor(status)}>
            <span className="mr-1">{getStatusIcon(status)}</span>
            {statusLabel[status] || status}
          </Badge>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        const status = row.getValue(columnId);
        return status.toLowerCase().includes(filterValue.toLowerCase());
      }
    },
    {
      accessorKey: 'fechaAfiliacion',
      header: 'Fecha Afiliación',
      cell: ({ getValue }) => {
        const fecha = getValue();
        return (
          <div className="font-medium">
            {fecha || <span className="text-gray-400">-</span>}
          </div>
        );
      }
    },
    {
      accessorKey: 'error',
      header: 'Error',
      cell: ({ getValue }) => {
        const error = getValue();
        return error ? (
          <div className="text-xs text-red-600 max-w-xs truncate" title={error}>
            {error}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      globalFilter: filtering
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registros</CardTitle>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filtering}
              onChange={(e) => setFiltering(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: ' ↑',
                            desc: ' ↓'
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="text-gray-500">
                      No hay registros para mostrar
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Mostrando {table.getRowModel().rows.length} de {records.length} registros
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm">
              Página {table.getState().pagination.pageIndex + 1} de{' '}
              {table.getPageCount()}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

