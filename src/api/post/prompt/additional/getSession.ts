import { LlamaChatSession, LlamaContext } from 'node-llama-cpp'
import { SeedChatWrapper } from 'node-llama-cpp/dist/chatWrappers/SeedChatWrapper.js'
import type { TResultCode } from '../../../../tresult'

export function GetSession(context: LlamaContext, systemPrompt: string | undefined, thinkingBudget?: number | null): TResultCode<LlamaChatSession> {
	try {
		const chatWrapper = thinkingBudget !== undefined
			? new SeedChatWrapper({ thinkingBudget })
			: undefined
		return {
			ok: true,
			result: new LlamaChatSession({
				contextSequence: context.getSequence(),
				systemPrompt: systemPrompt,
				...(chatWrapper !== undefined ? { chatWrapper } : {}),
			}),
		}
	} catch (err) {
		return { ok: false, error: `on create llama session: ${err}`, errorCode: 500 }
	}
}
