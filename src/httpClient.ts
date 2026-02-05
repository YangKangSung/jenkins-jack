import { fetch } from 'undici';

export interface RequestPromise extends Promise<string> {
  abort?: () => void;
}

function makeAbortableFetch(url: string, options: any = {}): RequestPromise {
  const controller = new AbortController();
  const p: any = (async () => {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    if (!res.ok && res.status !== 302) {
      const err: any = new Error(res.statusText);
      err.statusCode = res.status;
      err.error = text;
      throw err;
    }
    return text;
  })();
  p.abort = () => controller.abort();
  return p as RequestPromise;
}

export function get(url: string, options?: { headers?: any }): RequestPromise {
  return makeAbortableFetch(url, { headers: options?.headers });
}

export function post(urlOrOptions: any, options?: any): RequestPromise {
  let url: string;
  let fetchOptions: any = {};

  if (typeof urlOrOptions === 'object') {
    url = urlOrOptions.url;
    fetchOptions.method = 'POST';
    fetchOptions.headers = urlOrOptions.headers ?? {};
    if (urlOrOptions.form) {
      fetchOptions.body = new URLSearchParams(urlOrOptions.form).toString();
      if (!fetchOptions.headers['content-type'] && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
      }
    } else if (urlOrOptions.body) {
      fetchOptions.body = urlOrOptions.body;
    }
  } else {
    url = urlOrOptions;
    fetchOptions.method = 'POST';
    fetchOptions.headers = options?.headers ?? {};
    if (options?.form) {
      fetchOptions.body = new URLSearchParams(options.form).toString();
      if (!fetchOptions.headers['content-type'] && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
      }
    }
  }

  return makeAbortableFetch(url, fetchOptions);
}

export default { get, post };