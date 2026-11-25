/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to 'true' by `npm run build:demo`: the static build runs with no API server. */
  readonly VITE_DEMO?: string;
}
