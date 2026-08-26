import { ApiSuccess, ApiErrorResponse } from './api-response';

export interface ParsedResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
  status: number;
}

/**
 * Safely parses any fetch Response without ever throwing JSON syntax errors.
 * Handles HTML error pages, plain text responses, empty bodies, and standard API JSON.
 */
export async function parseApiResponse<T = any>(response: Response): Promise<ParsedResponse<T>> {
  const status = response.status;
  const contentType = response.headers.get('content-type') || '';

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (err: any) {
    return {
      success: false,
      status,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to read response from server.',
      },
    };
  }

  // Attempt JSON parsing if content-type includes json or if text looks like JSON
  if (contentType.includes('application/json') || (rawText.trim().startsWith('{') && rawText.trim().endsWith('}'))) {
    try {
      const json = JSON.parse(rawText);

      // Standard project API contract
      if (typeof json === 'object' && json !== null) {
        if ('success' in json) {
          if (json.success) {
            return {
              success: true,
              data: json.data !== undefined ? json.data : json,
              message: json.message,
              status,
            };
          } else {
            return {
              success: false,
              error: json.error || { code: 'API_ERROR', message: json.message || 'Request failed' },
              status,
            };
          }
        }

        // Direct object response fallback
        if (response.ok) {
          return {
            success: true,
            data: json as T,
            status,
          };
        } else {
          return {
            success: false,
            error: {
              code: json.code || (status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHENTICATED' : 'API_ERROR'),
              message: json.error || json.message || `Server returned error status ${status}`,
            },
            status,
          };
        }
      }
    } catch {
      // Fallback if JSON parsing failed despite headers
    }
  }

  // Non-JSON / HTML / Plain text handling
  if (response.ok) {
    return {
      success: true,
      data: rawText as unknown as T,
      status,
    };
  }

  // Extract clean text from HTML error pages if HTML returned
  let cleanErrorMessage = rawText;
  if (rawText.includes('<html') || rawText.includes('Internal Server Error')) {
    cleanErrorMessage = status === 500
      ? 'Internal server error occurred on the platform.'
      : status === 403
      ? 'Access forbidden. You do not have Super Admin permissions.'
      : status === 401
      ? 'Unauthenticated. Please log in again.'
      : `Server returned HTTP ${status}`;
  }

  return {
    success: false,
    error: {
      code: status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHENTICATED' : 'HTTP_ERROR',
      message: cleanErrorMessage || `Request failed with status ${status}`,
    },
    status,
  };
}

/**
 * Safe fetch wrapper that automatically parses the response using parseApiResponse.
 */
export async function safeFetch<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<ParsedResponse<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init?.headers || {}),
      },
    });
    return await parseApiResponse<T>(res);
  } catch (err: any) {
    return {
      success: false,
      status: 0,
      error: {
        code: 'NETWORK_FAILURE',
        message: err.message || 'Network connection failed.',
      },
    };
  }
}
