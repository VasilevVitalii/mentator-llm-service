const DEFAULT_TIMEOUT_MSEC = 60 * 60 * 1000

export type HttpOptions = Omit<RequestInit, 'method' | 'body'> & { timeoutMsec?: number }

function makeSignal(timeoutMsec: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMsec)
    return { signal: controller.signal, clear: () => clearTimeout(id) }
}

export async function get(url: string, options?: HttpOptions): Promise<Response> {
    const { timeoutMsec = DEFAULT_TIMEOUT_MSEC, ...rest } = options ?? {}
    const { signal, clear } = makeSignal(timeoutMsec)
    try {
        return await fetch(url, { ...rest, method: 'GET', signal })
    } finally {
        clear()
    }
}

export async function post(url: string, body?: unknown, options?: HttpOptions): Promise<Response> {
    const { timeoutMsec = DEFAULT_TIMEOUT_MSEC, ...rest } = options ?? {}
    const { signal, clear } = makeSignal(timeoutMsec)
    const isJson = body !== null && body !== undefined && typeof body === 'object'
    try {
        return await fetch(url, {
            ...rest,
            method: 'POST',
            signal,
            headers: {
                ...(isJson ? { 'Content-Type': 'application/json' } : {}),
                ...rest.headers,
            },
            body: isJson ? JSON.stringify(body) : (body as string | undefined),
        })
    } finally {
        clear()
    }
}

export async function request(url: string, options?: RequestInit & { timeoutMsec?: number }): Promise<Response> {
    const { timeoutMsec = DEFAULT_TIMEOUT_MSEC, ...rest } = options ?? {}
    const { signal, clear } = makeSignal(timeoutMsec)
    try {
        return await fetch(url, { ...rest, signal: rest.signal ?? signal })
    } finally {
        clear()
    }
}
