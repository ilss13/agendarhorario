import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

if (typeof globalThis.fetch !== 'function') {
  class ResponsePolyfill {}
  class HeadersPolyfill {}
  class RequestPolyfill {}
  Object.assign(globalThis, {
    Response: ResponsePolyfill,
    Headers: HeadersPolyfill,
    Request: RequestPolyfill,
    fetch: () => Promise.reject(new Error('fetch is not available in unit tests')),
  });
}

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
