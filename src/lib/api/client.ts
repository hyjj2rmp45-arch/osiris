/**
 * API Client — OSIRIS Phase 8
 * Generic HTTP client with authentication and error handling
 */

import { AdminAlerts } from '@/lib/admin-alerts';

export interface ApiClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ApiClient {
  get: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  post: <T, D>(endpoint: string, data: D, options?: RequestInit) => Promise<T>;
  put: <T, D>(endpoint: string, data: D, options?: RequestInit) => Promise<T>;
  patch: <T, D>(endpoint: string, data: D, options?: RequestInit) => Promise<T>;
  delete: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const { baseUrl = '', headers = {} } = options;

  const request = async <T>(
    method: string,
    endpoint: string,
    data?: unknown,
    customOptions: RequestInit = {}
  ): Promise<T> => {
    const url = `${baseUrl}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...customOptions.headers,
      },
      credentials: 'include',
      ...customOptions,
    };

    if (data !== undefined) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const message = `API error: ${response.status} ${response.statusText} - ${errorText}`;
      AdminAlerts.high(message, endpoint, 'api-client');
      throw new Error(message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  };

  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      request<T>('GET', endpoint, undefined, options),
    post: <T, D>(endpoint: string, data: D, options?: RequestInit) =>
      request<T>('POST', endpoint, data, options),
    put: <T, D>(endpoint: string, data: D, options?: RequestInit) =>
      request<T>('PUT', endpoint, data, options),
    patch: <T, D>(endpoint: string, data: D, options?: RequestInit) =>
      request<T>('PATCH', endpoint, data, options),
    delete: <T>(endpoint: string, options?: RequestInit) =>
      request<T>('DELETE', endpoint, undefined, options),
  };
}

export const apiClient = createApiClient();