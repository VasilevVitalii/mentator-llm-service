import { type LlamaModel, type LlamaContext, type Llama } from 'node-llama-cpp'
import { ModelManager, type TModelFile } from '../../../modelManager'
import type { TResultCode } from '../../../tresult'

let data: { model: LlamaModel; modelInfo: TModelFile } | undefined = undefined

export async function GetContext(llama: Llama, name: string): Promise<TResultCode<{ context: LlamaContext; loadModelStatus: 'exists' | 'load' }>> {
	try {
		let loadModelStatus = 'exists' as 'exists' | 'load'
		if (!data || data.modelInfo.name !== name) {
			if (data?.model) {
				await data.model.dispose()
			}
			const modelInfo = ModelManager().getModel(name)
			if (!modelInfo) {
				data = undefined
				return { ok: false, error: `Model not found: "${name}"`, errorCode: 400 }
			}
			const model = await llama.loadModel({ modelPath: modelInfo.fullFileName })
			data = {
				modelInfo,
				model,
			}
			loadModelStatus = 'load'
		}
		const context = await data.model.createContext()

		return { ok: true, result: { context, loadModelStatus } }
	} catch (err) {
		return { ok: false, error: `on load model "${name}": ${err}`, errorCode: 500 }
	}
}
