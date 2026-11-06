// YouTube sometimes answers a request with a passing server error ("Internal error encountered",
// "Backend error", HTTP 500/503). Those are worth asking again; quota, key or missing-playlist
// errors are not.
const TEMPORARY_REASONS = new Set(['internalError', 'backendError', 'serviceUnavailable', 'rateLimitExceeded']);

// status: the HTTP status; error: the `error` object of YouTube's JSON answer.
const isTemporaryError = (status, error) =>
  status >= 500 || (error?.errors ?? []).some((e) => TEMPORARY_REASONS.has(e.reason)) || /internal error|backend error/i.test(error?.message ?? '');

module.exports = { isTemporaryError };
