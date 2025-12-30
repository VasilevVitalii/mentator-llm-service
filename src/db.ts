import { Database } from 'bun:sqlite'
import { singleton } from './util/singleton'
import { QueueClass } from './queue'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

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
		} catch (err) {
			this.error = `failed to initialize database in file "${dbFilePath}": ${err}`
		}
	}

	async edit(fn: (db: Database) => void): Promise<void> {
		if (this.error) return
		return this._queue.add(async () => {
			fn(this._db!)
		})
	}

	read<T>(fn: (db: Database) => T): T {
		if (this.error || !this._db) return undefined as any
		return fn(this._db)
	}

	close(): void {
		if (this._db) {
			this._db.close()
		}
	}
}

export const Db = singleton(DbClass)
