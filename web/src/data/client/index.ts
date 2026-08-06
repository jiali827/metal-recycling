/**
 * HTTP API client skeleton.
 *
 * 后端接入时在此实现真实请求；业务层通过本模块访问远端，
 * 不要在 features / app 中直接 fetch。
 *
 * Mock 阶段仍使用 `@/data/mock/store`；切换时以 repository / service
 * 接口替换，保持 UI 层不变。
 */

export type ApiError = {
  status: number;
  message: string;
  code?: string;
};

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
};

const defaultConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
};

let clientConfig: ApiClientConfig = { ...defaultConfig };

export function configureApiClient(patch: Partial<ApiClientConfig>) {
  clientConfig = { ...clientConfig, ...patch };
}

export function getApiClientConfig(): Readonly<ApiClientConfig> {
  return clientConfig;
}

/**
 * 预留的通用请求方法。接 API 后补齐鉴权头、租户头与错误归一化。
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  void path;
  void init;
  throw new Error(
    "apiRequest is not implemented yet. Use @/data/mock/store during the mock phase.",
  );
}
