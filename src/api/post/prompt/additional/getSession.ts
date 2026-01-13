import { getLlama, LlamaChatSession, LlamaContext, type Llama } from 'node-llama-cpp'
import type { TResultCode } from '../../../../tresult'

export function GetSession(context: LlamaContext, systemPrompt: string | undefined): TResultCode<LlamaChatSession> {
	try {
		return {
			ok: true,
			result: new LlamaChatSession({
				contextSequence: context.getSequence(),
				systemPrompt: systemPrompt,
			}),
		}
	} catch (err) {
		return { ok: false, error: `on create llama session: ${err}`, errorCode: 500 }
	}
}
