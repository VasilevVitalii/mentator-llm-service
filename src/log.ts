import { singleton } from './util/singleton'
import { Db } from './db'

type LogLevel = 'error' | 'debug' | 'trace'

const LOG_LEVELS: Record<LogLevel, number> = {
	error: 0,
	debug: 1,
	trace: 2,
}
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60
const MAX_EXTRA_LENGTH = 500

function truncateExtra(extra: string | undefined): string | undefined {
	if (!extra) return undefined
	if (extra.length <= MAX_EXTRA_LENGTH) return extra
	return extra.substring(0, MAX_EXTRA_LENGTH) + '...'
}

class LogClass {
	private _level: LogLevel = 'debug'
	private _liveDay: number = 30
	private _lastCleanup: number = 0

	private _scheduleCleanup() {
		setInterval(() => {
			this._cleanupOldLogs()
		}, CLEANUP_INTERVAL_MS)
		this._cleanupOldLogs()
	}

	private _cleanupOldLogs() {
		const now = Date.now()
		if (now - this._lastCleanup < CLEANUP_INTERVAL_MS) return

		this._lastCleanup = now
		const cutoffTimestamp = now - this._liveDay * 24 * 60 * 60 * 1000

		Db().editCleanupOldLogs(cutoffTimestamp)
	}

	private _shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] <= LOG_LEVELS[this._level]
	}

	private _console(level: LogLevel, message: string) {
		if (level === 'error') {
			console.error(message)
		} else {
			console.log(message)
		}
	}

	private _logToConsole(timestamp: number, level: LogLevel, pipe: string, message: string, extra?: string) {
		const timestampISO = new Date(timestamp).toISOString()
		this._console(level, `[${timestampISO}] [${level}] [${pipe}] ${message}`)
		if (extra) {
			const truncated = truncateExtra(extra)
			if (truncated) {
				const lines = truncated.split('\n')
				for (const line of lines) {
					this._console(level, `        ${line}`)
				}
			}
		}
	}

	constructor(config: { level: LogLevel; liveDay: number }) {
		this._level = config.level
		this._liveDay = config.liveDay
		this._scheduleCleanup()
	}

	error(param: { pipe: string; message: string; extra?: string; ts?: number }): void
	error(pipe: string, message: string, extra?: string): void
	error(pipeOrParam: string | { pipe: string; message: string; extra?: string; ts?: number }, message?: string, extra?: string): void {
		if (!this._shouldLog('error')) return

		let pipe: string
		let msg: string
		let ext: string | undefined
		let timestamp: number

		if (typeof pipeOrParam === 'string') {
			pipe = pipeOrParam
			msg = message!
			ext = extra
			timestamp = Date.now()
		} else {
			pipe = pipeOrParam.pipe
			msg = pipeOrParam.message
			ext = pipeOrParam.extra
			timestamp = pipeOrParam.ts ?? Date.now()
		}

		const truncatedExt = truncateExtra(ext)
		this._logToConsole(timestamp, 'error', pipe, msg, ext)
		Db().editSaveLog('error', pipe, msg, truncatedExt, timestamp)
	}

	debug(param: { pipe: string; message: string; extra?: string; ts?: number }): void
	debug(pipe: string, message: string, extra?: string): void
	debug(pipeOrParam: string | { pipe: string; message: string; extra?: string; ts?: number }, message?: string, extra?: string): void {
		if (!this._shouldLog('debug')) return

		let pipe: string
		let msg: string
		let ext: string | undefined
		let timestamp: number

		if (typeof pipeOrParam === 'string') {
			pipe = pipeOrParam
			msg = message!
			ext = extra
			timestamp = Date.now()
		} else {
			pipe = pipeOrParam.pipe
			msg = pipeOrParam.message
			ext = pipeOrParam.extra
			timestamp = pipeOrParam.ts ?? Date.now()
		}

		const truncatedExt = truncateExtra(ext)
		this._logToConsole(timestamp, 'debug', pipe, msg, ext)
		Db().editSaveLog('debug', pipe, msg, truncatedExt, timestamp)
	}

	trace(param: { pipe: string; message: string; extra?: string; ts?: number }): void
	trace(pipe: string, message: string, extra?: string): void
	trace(pipeOrParam: string | { pipe: string; message: string; extra?: string; ts?: number }, message?: string, extra?: string): void {
		if (!this._shouldLog('trace')) return

		let pipe: string
		let msg: string
		let ext: string | undefined
		let timestamp: number

		if (typeof pipeOrParam === 'string') {
			pipe = pipeOrParam
			msg = message!
			ext = extra
			timestamp = Date.now()
		} else {
			pipe = pipeOrParam.pipe
			msg = pipeOrParam.message
			ext = pipeOrParam.extra
			timestamp = pipeOrParam.ts ?? Date.now()
		}

		const truncatedExt = truncateExtra(ext)
		this._logToConsole(timestamp, 'trace', pipe, msg, ext)
		Db().editSaveLog('trace', pipe, msg, truncatedExt, timestamp)
	}
}

export const Log = singleton(LogClass)
