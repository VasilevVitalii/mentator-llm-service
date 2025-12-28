type Constructor<T, Args extends any[] = any[]> = new (...args: Args) => T

export function singleton<T, Args extends any[]>(Ctor: Constructor<T, Args>) {
	let instance: T | null = null
	let initialized = false

	function init(...args: Args): T {
		if (initialized) throw new Error(`${Ctor.name} already initialized`)
		instance = new Ctor(...args)
		initialized = true
		return instance
	}

	function getInstance(): T {
		if (!initialized || !instance) throw new Error(`${Ctor.name} not initialized`)
		return instance
	}

	const proxy = new Proxy(getInstance, {
		apply(target, thisArg, argArray) {
			return target()
		},
	})

	;(proxy as any).init = init

	return proxy as (() => T) & { init: (...args: Args) => T }
}
