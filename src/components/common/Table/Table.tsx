/**
 * SmartLab Store — Componente Reutilizable Table (Diseño Responsive Multi-Dispositivo)
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 7.6) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 *
 * Soporta:
 * - Desplazamiento horizontal controlado (.table-scroll-container)
 * - Encabezados fijos (sticky top-0) y primera columna identificadora fija (sticky left-0)
 * - Vista alternativa de tarjetas apiladas (Card View) para dispositivos móviles
 */

import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  stickyLeft?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No se encontraron registros disponibles.',
  isLoading = false,
  mobileCardRender,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="w-7 h-7 border-3 border-[#0A68FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Cargando registros...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Vista de Tarjetas Apiladas en Móvil (si se provee mobileCardRender) */}
      {mobileCardRender && (
        <div className="block md:hidden space-y-3">
          {data.map((row, idx) => (
            <div
              key={keyExtractor(row, idx)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs"
            >
              {mobileCardRender(row, idx)}
            </div>
          ))}
        </div>
      )}

      {/* Tabla con Scroll Horizontal Controlado en Escritorio / Tablet */}
      <div
        className={`${
          mobileCardRender ? 'hidden md:block' : 'block'
        } bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs`}
      >
        <div className="table-scroll-container">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                  return (
                    <th
                      key={col.key}
                      className={[
                        'py-3.5 px-4 whitespace-nowrap sticky top-0 bg-[#F8FAFC] z-10',
                        col.stickyLeft ? 'left-0 z-20 shadow-[1px_0_0_0_#E2E8F0]' : '',
                        alignClass,
                        col.className || '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {data.map((row, idx) => (
                <tr
                  key={keyExtractor(row, idx)}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                    return (
                      <td
                        key={col.key}
                        className={[
                          'py-3.5 px-4 align-middle',
                          col.stickyLeft
                            ? 'sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#E2E8F0] font-medium'
                            : '',
                          alignClass,
                          col.className || '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {col.render(row, idx)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
