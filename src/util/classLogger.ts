import { Log } from '../log'

export abstract class ClassLogger {
	private _pipe: string

	constructor(pipe: string) {
		this._pipe = pipe
	}

	protected _onError(pipe: string, text: string): void {
		Log().error(`${this._pipe}`, `${pipe}: ${text}`)
	}

	protected _onLog(text: string): void {
		Log().debug(`${this._pipe}`, `${text}`)
	}
}
