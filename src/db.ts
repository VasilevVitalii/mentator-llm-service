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

	async getStatistics(intervalMsec: number): Promise<{
		total: number
		success: number
		failed: number
		avgPromtDuration: number
		avgQueueDuration: number
		p95PromtDuration: number
		p95QueueDuration: number
	}> {
		const cutoffTimestamp = Date.now() - intervalMsec

		if (this.error) {
			return {
				total: 0,
				success: 0,
				failed: 0,
				avgPromtDuration: 0,
				avgQueueDuration: 0,
				p95PromtDuration: 0,
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
						AVG(CASE WHEN code = 200 THEN durationPromtMsec END) as avgPromtDuration,
						AVG(durationQueueMsec) as avgQueueDuration
					FROM promt
					WHERE ts >= ?
				`)
				const stats = statsQuery.get(cutoffTimestamp) as any

				// Get all durations for percentile calculation
				const durationsQuery = this._db!.prepare(`
					SELECT
						durationPromtMsec,
						durationQueueMsec,
						code
					FROM promt
					WHERE ts >= ?
					ORDER BY durationPromtMsec
				`)
				const allDurations = durationsQuery.all(cutoffTimestamp) as Array<{
					durationPromtMsec: number
					durationQueueMsec: number
					code: number
				}>

				// Calculate 95th percentile for successful requests
				const successDurations = allDurations.filter(d => d.code === 200).map(d => d.durationPromtMsec)
				const queueDurations = allDurations.map(d => d.durationQueueMsec).sort((a, b) => a - b)

				const p95PromtDuration = this._calculatePercentile(successDurations, 0.95)
				const p95QueueDuration = this._calculatePercentile(queueDurations, 0.95)

				return {
					total: stats.total || 0,
					success: stats.success || 0,
					failed: stats.failed || 0,
					avgPromtDuration: stats.avgPromtDuration ? Math.round(stats.avgPromtDuration) : 0,
					avgQueueDuration: stats.avgQueueDuration ? Math.round(stats.avgQueueDuration) : 0,
					p95PromtDuration,
					p95QueueDuration,
				}
			} catch (err) {
				this.error = `${err}`
				Log().error(PIPE, `database error on get statistics: ${err}`)
				return {
					total: 0,
					success: 0,
					failed: 0,
					avgPromtDuration: 0,
					avgQueueDuration: 0,
					p95PromtDuration: 0,
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

	close(): void {
		if (this._db) {
			this._db.close()
		}
	}
}

export const Db = singleton(DbClass)
