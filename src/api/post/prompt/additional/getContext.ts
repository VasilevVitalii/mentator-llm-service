import { type LlamaModel, type LlamaContext, type Llama } from 'node-llama-cpp'
import { ModelManager, type TModelFile } from '../../../../modelManager'
import type { TResultCode } from '../../../../tresult'
import { Log } from '../../../../log'
import { ServerStats } from '../../../../serverStats'

let data: { model: LlamaModel; modelInfo: TModelFile; gpulayer: number | undefined } | undefined = undefined

export async function GetContext(llama: Llama, name: string, gpulayer?: number): Promise<TResultCode<{ context: LlamaContext; loadModelStatus: 'exists' | 'load' }>> {
	try {
		let loadModelStatus = 'exists' as 'exists' | 'load'
		const modelChanged = !data || data.modelInfo.name !== name
		const gpulayerChanged = data !== undefined && data.gpulayer !== gpulayer
		if (modelChanged || gpulayerChanged) {
			const modelInfo = ModelManager().getModel(name)
			if (!modelInfo) {
				return { ok: false, error: `Model not found: "${name}"`, errorCode: 400 }
			}

			if (data?.model) {
				try {
					await data.model.dispose()
				} catch (err) {
					Log().error('API.POST.PROMPT', `error disposing old model "${data.modelInfo.name}": ${err}`)
				}
				data = undefined
			}
			const loadTimestamp = Date.now()
			const model = await llama.loadModel({ modelPath: modelInfo.fullFileName, ...(gpulayer !== undefined ? { gpuLayers: gpulayer } : {}) })
			data = {
				modelInfo,
				model,
				gpulayer,
			}
			loadModelStatus = 'load'
			ServerStats().setCurrentModel(modelInfo, loadTimestamp, gpulayer)
		}
		const context = await data!.model.createContext()
		if (loadModelStatus === 'load') {
			Log().debug('APP', `load model to memory "${data!.modelInfo.name}" (size ${Math.ceil(data!.modelInfo.sizeKb / 1024)} mb, gpulayer ${gpulayer ?? 'auto'})${gpulayerChanged && !modelChanged ? ' - only gpulayer change' : ''}`)
		}

		return { ok: true, result: { context, loadModelStatus } }
	} catch (err) {
		return { ok: false, error: `on load model "${name}": ${err}`, errorCode: 500 }
	}
}
