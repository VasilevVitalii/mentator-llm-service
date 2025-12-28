export type TResult<T, E = string> = { ok: true; result: T } | { ok: false; error: E }
export type TResultCode<T, E = string> = { ok: true; result: T } | { ok: false; error: E; errorCode: 400 | 500 }
