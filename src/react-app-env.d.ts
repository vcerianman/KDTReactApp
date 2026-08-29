/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly PUBLIC_URL: string;
    readonly REACT_APP_API_BASE_URL?: string;
    readonly NEXT_PUBLIC_API_BASE_URL?: string;
    [key: string]: string | undefined;
  }
}
