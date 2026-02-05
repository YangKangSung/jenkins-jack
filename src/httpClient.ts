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

  // Return a promise immediately (RequestPromise) and perform crumb fetch if needed before actual POST.
  let aborted = false;
  let innerAbort: (() => void) | undefined;

  const p: any = (async () => {
    try {
      const headersLower = Object.keys(fetchOptions.headers || {}).map(h => h.toLowerCase());
      const hasCrumb = headersLower.includes('jenkins-crumb');
      const hasAuth = headersLower.includes('authorization');

      if (hasAuth && !hasCrumb) {
        try {
          const parsed = new URL(url);
          const origin = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
          // fetch crumb and capture set-cookie
          const crumbRes = await fetch(`${origin}/crumbIssuer/api/json`, { headers: fetchOptions.headers });
          if (crumbRes.ok) {
            const crumbBody: any = await crumbRes.json();
            const crumb = crumbBody?.crumb;
            if (crumb) { fetchOptions.headers[crumbBody?.crumbRequestField || 'Jenkins-Crumb'] = crumb; }
            const setCookie = crumbRes.headers.get('set-cookie');
            if (setCookie) { fetchOptions.headers['cookie'] = setCookie; }
          }
        } catch (err) {
          // ignore crumb fetch errors and proceed
        }
      }

      if (aborted) { throw new Error('aborted'); }

      const r = makeAbortableFetch(url, fetchOptions);
      innerAbort = r.abort;
      return await r;
    } catch (err) {
      throw err;
    }
  })();
  p.abort = () => {
    aborted = true;
    if (innerAbort) { try { innerAbort(); } catch (e) {} }
  };
  return p as RequestPromise;
}

export default { get, post };