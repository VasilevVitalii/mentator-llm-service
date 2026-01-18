import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { singleton } from './util/singleton'
import { QueueClass } from './queue'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { Log } from './log'

const PIPE = 'DB'

class DbClass {
	private _db: DatabaseType | undefined
	private _queue: QueueClass
	public error: string | undefined

	constructor(dbFilePath: string) {
		this._queue = new QueueClass()

		try {
			const dir = dirname(dbFilePath)
			mkdirSync(dir, { recursive: true })

			this._db = new Database(dbFilePath)
			this._db.pragma('journal_mode = WAL')
			this._db.pragma('busy_timeout = 5000')

			this._db.exec(`
				CREATE TABLE IF NOT EXISTS log (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL,
					pipe TEXT NOT NULL,
					kind TEXT NOT NULL,
					message TEXT NOT NULL
				)
			`)
			this._db.exec(`CREATE INDEX IF NOT EXISTS idx_log_ts ON log(ts)`)

			this._db.exec(`
				CREATE TABLE IF NOT EXISTS logExtra (
					id INTEGER NOT NULL,
					data TEXT NOT NULL,
					FOREIGN KEY (id) REFERENCES log(id) ON DELETE CASCADE
				)
			`)

			this._db.exec(`
				CREATE TABLE IF NOT EXISTS prompt (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL,
					durationPromptMsec INTEGER NOT NULL,
					durationQueueMsec INTEGER NOT NULL,
					code INTEGER NOT NULL
				)
			`)
			this._db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_ts ON prompt(ts)`)

			this._db.exec(`
				CREATE TABLE IF NOT EXISTS promptExtra (
					id INTEGER PRIMARY KEY,
					request TEXT NOT NULL,
					response TEXT NOT NULL,
					FOREIGN KEY (id) REFERENCES prompt(id)
				)
			`)
		} catch (err) {
			this.error = `failed to initialize database in file "${dbFilePath}": ${err}`
		}
	}

	async editSavePrompt(
		code: number,
		request: any,
		response: any,
		duration?: { promptMsec?: number; queueMsec?: number }
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
					'INSERT INTO prompt (ts, durationPromptMsec, durationQueueMsec, code) VALUES (?, ?, ?, ?)',
				)
				const result = query1.run(ts, duration?.promptMsec || 0, duration?.queueMsec || 0, code)
				const promptId = result.lastInsertRowid

				const query2 = this._db!.prepare('INSERT INTO promptExtra (id, request, response) VALUES (?, ?, ?)')
				query2.run(promptId, requestText, responseText)
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on save prompt: ${err}`)
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
				this._db!.prepare('DELETE FROM logExtra WHERE id IN (SELECT id FROM log WHERE ts < ?)').run(cutoffTimestamp)
				this._db!.prepare('DELETE FROM log WHERE ts < ?').run(cutoffTimestamp)
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on cleanup old logs: ${err}`)
			}
		})
	}

	async getStatistics(intervalMsec: number): Promise<{
		total: number
		success: number
		failed: number
		avgPromptDuration: number
		avgQueueDuration: number
		p95PromptDuration: number
		p95QueueDuration: number
	}> {
		const cutoffTimestamp = Date.now() - intervalMsec

		if (this.error) {
			return {
				total: 0,
				success: 0,
				failed: 0,
				avgPromptDuration: 0,
				avgQueueDuration: 0,
				p95PromptDuration: 0,
				p95QueueDuration: 0,
			}
		}

		return await this._queue.add(async () => {
			try {
				// Get counts and averages
				const statsQuery = this._db!.prepare(`
					SELECT
						COUNT(*) as total,
						COUNT(CASE WHEN code = 200 THEN 1 END) as success,
						COUNT(CASE WHEN code != 200 THEN 1 END) as failed,
						AVG(CASE WHEN code = 200 THEN durationPromptMsec END) as avgPromptDuration,
						AVG(durationQueueMsec) as avgQueueDuration
					FROM prompt
					WHERE ts >= ?
				`)
				const stats = statsQuery.get(cutoffTimestamp) as any

				// Get all durations for percentile calculation
				const durationsQuery = this._db!.prepare(`
					SELECT
						durationPromptMsec,
						durationQueueMsec,
						code
					FROM prompt
					WHERE ts >= ?
					ORDER BY durationPromptMsec
				`)
				const allDurations = durationsQuery.all(cutoffTimestamp) as Array<{
					durationPromptMsec: number
					durationQueueMsec: number
					code: number
				}>

				// Calculate 95th percentile for successful requests
				const successDurations = allDurations.filter(d => d.code === 200).map(d => d.durationPromptMsec)
				const queueDurations = allDurations.map(d => d.durationQueueMsec).sort((a, b) => a - b)

				const p95PromptDuration = this._calculatePercentile(successDurations, 0.95)
				const p95QueueDuration = this._calculatePercentile(queueDurations, 0.95)

				return {
					total: stats.total || 0,
					success: stats.success || 0,
					failed: stats.failed || 0,
					avgPromptDuration: stats.avgPromptDuration ? Math.round(stats.avgPromptDuration) : 0,
					avgQueueDuration: stats.avgQueueDuration ? Math.round(stats.avgQueueDuration) : 0,
					p95PromptDuration,
					p95QueueDuration,
				}
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get statistics: ${err}`)
				return {
					total: 0,
					success: 0,
					failed: 0,
					avgPromptDuration: 0,
					avgQueueDuration: 0,
					p95PromptDuration: 0,
					p95QueueDuration: 0,
				}
			}
		})
	}

	private _calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0

		const sorted = [...values].sort((a, b) => a - b)
		const index = Math.ceil(sorted.length * percentile) - 1
		return sorted[Math.max(0, index)] || 0
	}

	async getCoreLogs(afterId: number, limit: number): Promise<
		Array<{
			id: number
			ts: number
			pipe: string
			kind: string
			message: string
			extra?: string
		}>
	> {
		if (this.error) return []

		return await this._queue.add(async () => {
			try {
				const logsQuery = this._db!.prepare(`
					SELECT id, ts, pipe, kind, message
					FROM log
					WHERE id > ?
					ORDER BY id DESC
					LIMIT ?
				`)
				const logs = logsQuery.all(afterId, limit) as Array<{
					id: number
					ts: number
					pipe: string
					kind: string
					message: string
				}>

				const extraQuery = this._db!.prepare('SELECT data FROM logExtra WHERE id = ?')

				return logs.map(log => {
					const extraRow = extraQuery.get(log.id) as { data: string } | undefined
					return {
						...log,
						extra: extraRow?.data,
					}
				})
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get core logs: ${err}`)
				return []
			}
		})
	}

	async getCoreLogsByDate(
		dateStart: number,
		dateEnd: number,
	): Promise<
		Array<{
			id: number
			ts: number
			pipe: string
			kind: string
			message: string
			extra?: string
		}>
	> {
		if (this.error) return []

		return await this._queue.add(async () => {
			try {
				const logsQuery = this._db!.prepare(`
					SELECT id, ts, pipe, kind, message
					FROM log
					WHERE ts >= ? AND ts < ?
					ORDER BY id ASC
				`)
				const logs = logsQuery.all(dateStart, dateEnd) as Array<{
					id: number
					ts: number
					pipe: string
					kind: string
					message: string
				}>

				const extraQuery = this._db!.prepare('SELECT data FROM logExtra WHERE id = ?')

				return logs.map(log => {
					const extraRow = extraQuery.get(log.id) as { data: string } | undefined
					return {
						...log,
						extra: extraRow?.data,
					}
				})
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get core logs by date: ${err}`)
				return []
			}
		})
	}

	async getChatLogs(afterId: number, limit: number): Promise<
		Array<{
			id: number
			ts: number
			code: number
			durationPromptMsec: number
			durationQueueMsec: number
			request?: string
			response?: string
		}>
	> {
		if (this.error) return []

		return await this._queue.add(async () => {
			try {
				const promptQuery = this._db!.prepare(`
					SELECT id, ts, code, durationPromptMsec, durationQueueMsec
					FROM prompt
					WHERE id > ?
					ORDER BY id DESC
					LIMIT ?
				`)
				const prompts = promptQuery.all(afterId, limit) as Array<{
					id: number
					ts: number
					code: number
					durationPromptMsec: number
					durationQueueMsec: number
				}>

				const extraQuery = this._db!.prepare('SELECT request, response FROM promptExtra WHERE id = ?')

				return prompts.map(prompt => {
					const extraRow = extraQuery.get(prompt.id) as { request: string; response: string } | undefined
					return {
						...prompt,
						request: extraRow?.request,
						response: extraRow?.response,
					}
				})
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get chat logs: ${err}`)
				return []
			}
		})
	}

	async getChatLogsByDateHour(
		dateStart: number,
		dateEnd: number,
	): Promise<
		Array<{
			id: number
			ts: number
			code: number
			durationPromptMsec: number
			durationQueueMsec: number
			request?: string
			response?: string
		}>
	> {
		if (this.error) return []

		return await this._queue.add(async () => {
			try {
				const promptQuery = this._db!.prepare(`
					SELECT id, ts, code, durationPromptMsec, durationQueueMsec
					FROM prompt
					WHERE ts >= ? AND ts < ?
					ORDER BY id ASC
				`)
				const prompts = promptQuery.all(dateStart, dateEnd) as Array<{
					id: number
					ts: number
					code: number
					durationPromptMsec: number
					durationQueueMsec: number
				}>

				const extraQuery = this._db!.prepare('SELECT request, response FROM promptExtra WHERE id = ?')

				return prompts.map(prompt => {
					const extraRow = extraQuery.get(prompt.id) as { request: string; response: string } | undefined
					return {
						...prompt,
						request: extraRow?.request,
						response: extraRow?.response,
					}
				})
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get chat logs by date hour: ${err}`)
				return []
			}
		})
	}

	async editClearChatLogs(): Promise<number> {
		if (this.error) return 0

		return await this._queue.add(async () => {
			try {
				const countQuery = this._db!.prepare('SELECT COUNT(*) as count FROM prompt')
				const count = (countQuery.get() as { count: number }).count

				this._db!.prepare('DELETE FROM promptExtra').run()
				this._db!.prepare('DELETE FROM prompt').run()

				return count
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on clear chat logs: ${err}`)
				return 0
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
