export type TClassLogger = {
	onErrorCore: (text: string) => void,
	onLogCore: (text: string) => void
}

export abstract class ClassLogger {
	private _className: string
	private _callback: TClassLogger

	constructor(className: string, callback: TClassLogger) {
		this._className = className
		this._callback = callback
	}

	protected _onError(func: string, text: string): void {
		this._callback.onErrorCore(`${this._className}.${func}: ${text}`)
	}

	protected _onLog(func: string, text: string): void {
		this._callback.onLogCore(`${this._className}.${func}: ${text}`)
	}
}
