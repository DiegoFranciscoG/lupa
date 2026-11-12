import {fmtUsdShort} from '../lib/format';

export interface Bar {
  label: string;
  value: number;
  /** Highlighted bar: one accent series, the rest muted. */
  isAccent?: boolean;
}

interface Props {
  title: string;
  bars: Bar[];
  format?: (v: number) => string;
  /** Horizontal bars for categories, vertical bars for a time series. */
  orientation?: 'horizontal' | 'vertical';
}

/** Hand-written SVG chart: baseline at zero, hairline grid, equivalent data table for screen readers. */
export function BarChart({title, bars, format = fmtUsdShort, orientation = 'vertical'}: Props) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const id = `chart-${title.replace(/\W+/g, '-').toLowerCase()}`;

  if (orientation === 'horizontal') {
    const rowH = 28;
    const labelW = 260;
    const width = 720;
    const plotW = width - labelW - 90;
    const height = bars.length * rowH + 8;
    return (
      <figure aria-labelledby={`${id}-cap`} style={{margin: 0}}>
        <svg className="lupa-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-cap`}>
          {bars.map((b, i) => {
            const w = max > 0 ? (b.value / max) * plotW : 0;
            const y = i * rowH + 4;
            return (
              <g key={b.label}>
                <text x={labelW - 8} y={y + 15} textAnchor="end">
                  {b.label.length > 30 ? `${b.label.slice(0, 29)}…` : b.label}
                </text>
                <rect className={b.isAccent === false ? 'bar-muted' : 'bar'} x={labelW} y={y} width={w} height={18} rx={2} />
                <text className="value" x={labelW + w + 6} y={y + 14}>
                  {format(b.value)}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption id={`${id}-cap`} className="visually-hidden">
          {title}
        </figcaption>
        <ChartTable title={title} bars={bars} format={format} />
      </figure>
    );
  }

  const width = 720;
  const height = 260;
  const left = 72;
  const bottom = 28;
  const plotH = height - bottom - 12;
  const step = bars.length > 0 ? (width - left) / bars.length : 0;
  const barW = Math.min(24, step * 0.7);
  return (
    <figure aria-labelledby={`${id}-cap`} style={{margin: 0}}>
      <svg className="lupa-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-cap`}>
        {ticks.map((t) => {
          const y = 12 + plotH - (max > 0 ? (t / max) * plotH : 0);
          return (
            <g key={t}>
              <line className="grid" x1={left} x2={width} y1={y} y2={y} />
              <text x={left - 8} y={y + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          const h = max > 0 ? (b.value / max) * plotH : 0;
          const x = left + i * step + (step - barW) / 2;
          return (
            <g key={b.label}>
              <rect className={b.isAccent === false ? 'bar-muted' : 'bar'} x={x} y={12 + plotH - h} width={barW} height={h} rx={2}>
                <title>{`${b.label}: ${format(b.value)}`}</title>
              </rect>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption id={`${id}-cap`} className="visually-hidden">
        {title}
      </figcaption>
      <ChartTable title={title} bars={bars} format={format} />
    </figure>
  );
}

function ChartTable({title, bars, format}: {title: string; bars: Bar[]; format: (v: number) => string}) {
  return (
    <table className="visually-hidden">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Categoría</th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody>
        {bars.map((b) => (
          <tr key={b.label}>
            <th scope="row">{b.label}</th>
            <td>{format(b.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
