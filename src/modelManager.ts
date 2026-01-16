import type { TResult } from './tresult'
import { fsReadDir, fsReadDirSync } from './util/fsReadDir'
import { singleton } from './util/singleton'
import { ClassLogger } from './util/classLogger'
import { basename, dirname, join } from 'path'

const PIPE = 'MANAGER.MODEL'

export type TModelFile = {
	relativeFileName: string
	name: string
	sizeKb: number
}

class ModelManagerClass extends ClassLogger {
	private _modelDir: string
	private _modelFileList: TModelFile[] = []
	private _scanTimeout: NodeJS.Timeout | null = null

	private async _scanModelDir() {
		const fileListRes = await fsReadDir(this._modelDir)
		if (!fileListRes.ok) {
			this._onError('_scanModelDir', fileListRes.error)
			this._modelFileList = []
			return
		}
		const modelFileList = [] as TModelFile[]
		const fileNew = [] as string[]
		const fileRemove = [] as string[]

		fileListRes.result.forEach(fileItem => {
			if (!fileItem.relativeFileName) return
			if (!fileItem.relativeFileName.toLowerCase().endsWith('.gguf')) return
			if (!fileItem.sizeKb) return
			let name = basename(fileItem.relativeFileName)
			if (modelFileList.some(f => f.name === name)) {
				name = `${name} (${dirname(fileItem.relativeFileName)})`
			}
			modelFileList.push({
				name: name,
				relativeFileName: fileItem.relativeFileName,
				sizeKb: fileItem.sizeKb,
			})
			if (!this._modelFileList.some(f => f.name === name)) {
				fileNew.push(name)
			}
		})
		this._modelFileList.forEach(existsFileItem => {
			if (!modelFileList.some(f => f.name === existsFileItem.name)) {
				fileRemove.push(existsFileItem.name)
			}
		})

		this._modelFileList = modelFileList
		let logText = ''
		if (fileRemove.length > 0) {
			logText = `remove model(s): "${fileRemove.join('", "')}";`
		}
		if (fileNew.length > 0) {
			logText = `${logText}${logText.length > 0 ? ' ' : ''}add model(s): "${fileNew.join('", "')}";`
		}
		if (logText.length > 0) {
			this._onLog(logText)
		}
	}

	constructor(modelDir: string) {
		super(PIPE)
		this._modelDir = modelDir
	}

	scanModelDirStart(intervalMsec: number): void {
		this.scanModelDirStop()
		this._scanModelDir().then(() => {
			const scheduleNext = () => {
				this._scanTimeout = setTimeout(() => {
					this._scanModelDir().then(() => {
						scheduleNext()
					})
				}, intervalMsec)
			}
			scheduleNext()
		})
	}

	scanModelDirStop(): void {
		if (this._scanTimeout) {
			clearTimeout(this._scanTimeout)
			this._scanTimeout = null
		}
	}

	getModel(name: string): (TModelFile & { fullFileName: string }) | undefined {
		const model = this._modelFileList.find(f => f.name === name)
		return model
			? {
					fullFileName: join(this._modelDir, model.relativeFileName),
					...model,
			  }
			: undefined
	}

	getModelList(): TModelFile[] {
		return this._modelFileList
	}
}

export const ModelManager = singleton(ModelManagerClass)
