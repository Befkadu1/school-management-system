// Small, pure helpers. Functions in, functions out; nothing here mutates its input.

export const pipe = <A, B>(...fns: Array<(x: any) => any>) => (input: A): B => fns.reduce((acc, fn) => fn(acc), input as any);

export const groupBy = <T, K extends PropertyKey>(xs: readonly T[], key: (x: T) => K): Record<K, T[]> =>
  xs.reduce((acc, x) => {
    const k = key(x);
    (acc[k] ??= []).push(x);
    return acc;
  }, {} as Record<K, T[]>);

export const sumBy = <T>(xs: readonly T[], f: (x: T) => number): number => xs.reduce((s, x) => s + f(x), 0);

export const formatBirr = (santim: number): string =>
  `${(santim / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} birr`;

export const fullName = (s: { firstName: string; fatherName: string; grandfatherName: string }) =>
  `${s.firstName} ${s.fatherName} ${s.grandfatherName}`;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Returns a function that runs `fn` only after `ms` of silence. */
export const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

/** "Grade 5A", but "KG2A" for kindergarten classes. */
export const classLabel = (c: { grade: string; section: string }) =>
  c.grade.startsWith('KG') ? `${c.grade}${c.section}` : `Grade ${c.grade}${c.section}`;
