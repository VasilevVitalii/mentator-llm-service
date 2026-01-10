import { singleton } from './util/singleton'
import { type TModelFile } from './modelManager'

type TModelStats = {
	name: string
	sizeMb: number
	loadTimestamp: number
}

class ServerStatsClass {
	private _serverStartTimestamp: number
	private _currentModel: TModelStats | null = null

	constructor() {
		this._serverStartTimestamp = Date.now()
	}

	getServerStartTimestamp(): number {
		return this._serverStartTimestamp
	}

	getServerUptimeSeconds(): number {
		return Math.floor((Date.now() - this._serverStartTimestamp) / 1000)
	}

	setCurrentModel(modelInfo: TModelFile, loadTimestamp: number): void {
		this._currentModel = {
			name: modelInfo.name,
			sizeMb: Math.ceil(modelInfo.sizeKb / 1024),
			loadTimestamp,
		}
	}

	getCurrentModel(): TModelStats | null {
		return this._currentModel
	}

	getMemoryUsageMb(): number {
		const usage = process.memoryUsage()
		return Math.ceil(usage.rss / 1024 / 1024)
	}

	getMemoryHeapMb(): number {
		const usage = process.memoryUsage()
		return Math.ceil(usage.heapUsed / 1024 / 1024)
	}

	getMemoryExternalMb(): number {
		const usage = process.memoryUsage()
		return Math.ceil(usage.external / 1024 / 1024)
	}
}

export const ServerStats = singleton(ServerStatsClass)
