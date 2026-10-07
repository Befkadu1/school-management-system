// The page is deliberately not re-exported here: App.tsx lazy-loads it, and
// pulling it through this barrel would drag it into the start-up bundle.
export * from './students.command';
export * from './students.handler';
export * from './factory';
