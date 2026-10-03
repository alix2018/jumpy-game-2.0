/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SCORE_HASH_SALT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
