import { singleton } from './util/singleton'
import { Db } from './db'

type LogLevel = 'error' | 'debug' | 'trace'

const LOG_LEVELS: Record<LogLevel, number> = {
	error: 0,
	debug: 1,
	trace: 2,
}
const PIPE = 'logger'
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60

class LogClass {
	private _level: LogLevel = 'debug'
	private _liveDay: number = 30
	private _lastCleanup: number = 0
	private _allowDb: boolean = true

	private _initTables() {
		try {
			const db = Db()
			db.read(conn => {
				conn.run(`
				CREATE TABLE IF NOT EXISTS log (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL,
					pipe TEXT NOT NULL,
					kind TEXT NOT NULL,
					message TEXT NOT NULL
				)
			`)
				conn.run(`
				CREATE TABLE IF NOT EXISTS logExtra (
					id INTEGER NOT NULL,
					data TEXT NOT NULL,
					FOREIGN KEY (id) REFERENCES log(id) ON DELETE CASCADE
				)
			`)
				conn.run(`CREATE INDEX IF NOT EXISTS idx_log_ts ON log(ts)`)
			})
		} catch (err) {
			this.error(PIPE, `on create tables in db: ${err}`)
		}
	}

	private _scheduleCleanup() {
		setInterval(() => {
			this._cleanupOldLogs()
		}, CLEANUP_INTERVAL_MS)
		this._cleanupOldLogs()
	}

	private _cleanupOldLogs() {
		try {
			const now = Date.now()
			if (now - this._lastCleanup < CLEANUP_INTERVAL_MS) return

			this._lastCleanup = now
			const cutoffTimestamp = now - this._liveDay * 24 * 60 * 60 * 1000

			Db().edit(conn => {
				conn.run('DELETE FROM logExtra WHERE id IN (SELECT id FROM log WHERE ts < ?)', [cutoffTimestamp])
				conn.run('DELETE FROM log WHERE ts < ?', [cutoffTimestamp])
			})
		} catch (err) {
			this.error(PIPE, `on clear old log: ${err}`)
		}
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
			const lines = extra.split('\n')
			for (const line of lines) {
				this._console(level, `        ${line}`)
			}
		}
	}

	private _logToDb(timestamp: number, level: LogLevel, pipe: string, message: string, extra?: string) {
		if (!this._allowDb) return

		Db()
			.edit(conn => {
				const stmt = conn.prepare('INSERT INTO log (ts, pipe, kind, message) VALUES (?, ?, ?, ?)')
				const result = stmt.run(timestamp, pipe, level, message)
				const logId = result.lastInsertRowid

				if (extra) {
					const stmtExtra = conn.prepare('INSERT INTO logExtra (id, data) VALUES (?, ?)')
					stmtExtra.run(logId, extra)
				}
			})
			.catch(err => {
				this._allowDb = false
				this.error(PIPE, `on write log to db: ${err}`)
			})
	}

	constructor(config: { level: LogLevel; liveDay: number }) {
		this._level = config.level
		this._liveDay = config.liveDay
		this._initTables()
		this._scheduleCleanup()
	}

	error(pipe: string, message: string, extra?: string): void {
		if (!this._shouldLog('error')) return

		const timestamp = Date.now()
		this._logToConsole(timestamp, 'error', pipe, message, extra)
		this._logToDb(timestamp, 'error', pipe, message, extra)
	}

	debug(pipe: string, message: string, extra?: string): void {
		if (!this._shouldLog('debug')) return

		const timestamp = Date.now()
		this._logToConsole(timestamp, 'debug', pipe, message, extra)
		this._logToDb(timestamp, 'debug', pipe, message, extra)
	}

	trace(pipe: string, message: string, extra?: string): void {
		if (!this._shouldLog('trace')) return

		const timestamp = Date.now()
		this._logToConsole(timestamp, 'trace', pipe, message, extra)
		this._logToDb(timestamp, 'trace', pipe, message, extra)
	}
}

export const Log = singleton(LogClass)
