import { type LlamaModel, type LlamaContext, type Llama } from 'node-llama-cpp'
import { ModelManager, type TModelFile } from '../../../modelManager'
import type { TResultCode } from '../../../tresult'
import { Log } from '../../../log'
import { ServerStats } from '../../../serverStats'

let data: { model: LlamaModel; modelInfo: TModelFile } | undefined = undefined

export async function GetContext(llama: Llama, name: string): Promise<TResultCode<{ context: LlamaContext; loadModelStatus: 'exists' | 'load' }>> {
	try {
		let loadModelStatus = 'exists' as 'exists' | 'load'
		if (!data || data.modelInfo.name !== name) {
			const modelInfo = ModelManager().getModel(name)
			if (!modelInfo) {
				return { ok: false, error: `Model not found: "${name}"`, errorCode: 400 }
			}

			if (data?.model) {
				try {
					await data.model.dispose()
				} catch (err) {
					Log().error('POST.PROMT', `error disposing old model "${data.modelInfo.name}": ${err}`)
				}
				data = undefined
			}
			const loadTimestamp = Date.now()
			const model = await llama.loadModel({ modelPath: modelInfo.fullFileName })
			data = {
				modelInfo,
				model,
			}
			loadModelStatus = 'load'
			ServerStats().setCurrentModel(modelInfo, loadTimestamp)
		}
		const context = await data.model.createContext()
		if (loadModelStatus === 'load') {
			Log().debug('POST.PROMT', `in memory load model "${data.modelInfo.name}" (${Math.ceil(data.modelInfo.sizeKb / 1024)} mb)`)
		}

		return { ok: true, result: { context, loadModelStatus } }
	} catch (err) {
		return { ok: false, error: `on load model "${name}": ${err}`, errorCode: 500 }
	}
}
