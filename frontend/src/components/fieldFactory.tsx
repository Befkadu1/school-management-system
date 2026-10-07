import type { ChangeEvent } from 'react';

/**
 * Factory pattern for forms: describe fields as data, and the factory creates
 * the right input for each kind. Adding a field is one line of config.
 */
export type FieldSpec<K extends string> =
  | { name: K; label: string; kind: 'text' | 'tel'; required?: boolean; placeholder?: string }
  | { name: K; label: string; kind: 'select'; options: { value: string; label: string }[]; required?: boolean };

export const createField = <K extends string>(spec: FieldSpec<K>, value: string, onChange: (name: K, value: string) => void) => {
  const handle = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(spec.name, e.target.value);
  const control = spec.kind === 'select'
    ? (
      <select name={spec.name} value={value} onChange={handle} required={spec.required}>
        <option value="">Choose…</option>
        {spec.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
    : <input name={spec.name} type={spec.kind} value={value} onChange={handle} required={spec.required} placeholder={spec.placeholder} />;
  return <label className="field" key={spec.name}>{spec.label}{control}</label>;
};
