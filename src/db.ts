import { Database } from 'bun:sqlite'
import { singleton } from './util/singleton'
import { QueueClass } from './queue'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { Log } from './log'

const PIPE = 'DB'

class DbClass {
	private _db: Database | undefined
	private _queue: QueueClass
	public error: string | undefined

	constructor(dbFilePath: string) {
		this._queue = new QueueClass()

		try {
			const dir = dirname(dbFilePath)
			mkdirSync(dir, { recursive: true })

			this._db = new Database(dbFilePath, { create: true })
			this._db.run('PRAGMA journal_mode = WAL')
			this._db.run('PRAGMA busy_timeout = 5000')

			this._db.run(`
				CREATE TABLE IF NOT EXISTS log (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL,
					pipe TEXT NOT NULL,
					kind TEXT NOT NULL,
					message TEXT NOT NULL
				)
			`)
			this._db.run(`CREATE INDEX IF NOT EXISTS idx_log_ts ON log(ts)`)

			this._db.run(`
				CREATE TABLE IF NOT EXISTS logExtra (
					id INTEGER NOT NULL,
					data TEXT NOT NULL,
					FOREIGN KEY (id) REFERENCES log(id) ON DELETE CASCADE
				)
			`)

			this._db.run(`
				CREATE TABLE IF NOT EXISTS promt (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL,
					durationPromtMsec INTEGER NOT NULL,
					durationQueueMsec INTEGER NOT NULL,
					code INTEGER NOT NULL
				)
			`)
			this._db.run(`CREATE INDEX IF NOT EXISTS idx_promt_ts ON promt(ts)`)

			this._db.run(`
				CREATE TABLE IF NOT EXISTS promtExtra (
					id INTEGER PRIMARY KEY,
					request TEXT NOT NULL,
					response TEXT NOT NULL,
					FOREIGN KEY (id) REFERENCES promt(id)
				)
			`)
		} catch (err) {
			this.error = `failed to initialize database in file "${dbFilePath}": ${err}`
		}
	}

	async editSavePromt(
		code: number,
		request: any,
		response: any,
		duration: { promtMsec: number; queueMsec: number },
		saveExtra: boolean,
	): Promise<{ requestKB: string; responseKB: string; ts: number }> {
		const ts = Date.now()
		const requestText = JSON.stringify(request)
		const requestKB = (Buffer.byteLength(requestText) / 1024).toFixed(2)

		const responseText = JSON.stringify(response)
		const responseKB = (Buffer.byteLength(responseText) / 1024).toFixed(2)

		if (this.error) return { requestKB, responseKB, ts }

		await this._queue.add(async () => {
			try {
				const query1 = this._db!.prepare(
					'INSERT INTO promt (ts, durationPromtMsec, durationQueueMsec, code) VALUES (?, ?, ?, ?)',
				)
				const result = query1.run(ts, duration.promtMsec, duration.queueMsec, code)
				const promtId = result.lastInsertRowid

				if (saveExtra) {
					const query2 = this._db!.prepare('INSERT INTO promtExtra (id, request, response) VALUES (?, ?, ?)')
					query2.run(promtId, requestText, responseText)
				}
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on save promt: ${err}`)
			}
		})

		return { requestKB, responseKB, ts }
	}

	async editSaveLog(
		level: 'error' | 'debug' | 'trace',
		pipe: string,
		message: string,
		extra?: string,
		ts?: number,
	): Promise<{ ts: number }> {
		const timestamp = ts ?? Date.now()

		if (this.error) return { ts: timestamp }

		await this._queue.add(async () => {
			try {
				const query1 = this._db!.prepare('INSERT INTO log (ts, pipe, kind, message) VALUES (?, ?, ?, ?)')
				const result = query1.run(timestamp, pipe, level, message)
				const logId = result.lastInsertRowid

				if (extra) {
					const query2 = this._db!.prepare('INSERT INTO logExtra (id, data) VALUES (?, ?)')
					query2.run(logId, extra)
				}
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on save log: ${err}`)
			}
		})

		return { ts: timestamp }
	}

	async editCleanupOldLogs(cutoffTimestamp: number): Promise<void> {
		if (this.error) return

		await this._queue.add(async () => {
			try {
				this._db!.run('DELETE FROM logExtra WHERE id IN (SELECT id FROM log WHERE ts < ?)', [cutoffTimestamp])
				this._db!.run('DELETE FROM log WHERE ts < ?', [cutoffTimestamp])
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on cleanup old logs: ${err}`)
			}
		})
	}

	close(): void {
		if (this._db) {
			this._db.close()
		}
	}
}

export const Db = singleton(DbClass)
