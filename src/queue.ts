import { singleton } from './util/singleton'

export class QueueClass {
	private _queue: Array<() => Promise<void>> = []
	private _processing = false

	private async _process() {
		if (this._processing) return

		this._processing = true

		try {
			const task = this._queue.shift()
			if (!task) return
			await task()
		} finally {
			this._processing = false
			if (this._queue.length > 0) {
				this._process()
			}
		}
	}

	async add<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this._queue.push(async () => {
				try {
					const result = await fn()
					resolve(result)
				} catch (err) {
					reject(err)
				}
			})
			this._process()
		})
	}

	getSize(): number {
		return this._queue.length
	}

	isProcessing(): boolean {
		return this._processing
	}
}

export const QueuePromt = singleton(QueueClass)
