declare module '@playwright/test' {
  export type APIRequestContext = any;
  export type BrowserContext = any;
  export const devices: Record<string, any>;
  export function defineConfig(config: any): any;
}
