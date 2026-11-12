import type {ReactNode} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';

/** Sticky column header, like a social feed: title, one line of context, optional links. */
export function PageHeader({title, lead, children}: {title: string; lead?: ReactNode; children?: ReactNode}) {
  return (
    <header className="feed-head">
      <h1>{title}</h1>
      {lead ? <p className="lead">{lead}</p> : null}
      {children ? <div style={{paddingBottom: 12}}>{children}</div> : null}
    </header>
  );
}

/** Body of a page inside the feed column. */
export function PageBody({children}: {children: ReactNode}) {
  return (
    <div className="feed-body">
      <VStack gap={5}>{children}</VStack>
    </div>
  );
}

export function Stat({label, value, note}: {label: string; value: string; note?: string}) {
  return (
    <div className="stat">
      <VStack gap={1}>
        <Text type="supporting" color="secondary">
          {label}
        </Text>
        <span className="lupa-figure">{value}</span>
        {note ? (
          <Text type="supporting" color="secondary">
            {note}
          </Text>
        ) : null}
      </VStack>
    </div>
  );
}

/** Native select with a visible label: accessible and predictable on mobile. */
export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{value: string; label: string}>;
  onChange: (v: string) => void;
}) {
  const id = `sel-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <VStack gap={1}>
      <label htmlFor={id}>
        <Text type="label">{label}</Text>
      </label>
      <select id={id} className="lupa-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </VStack>
  );
}
