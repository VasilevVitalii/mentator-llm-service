import { LlamaChatSession, LlamaContext } from 'node-llama-cpp'
import type { TResultCode } from '../../../../tresult'

function buildSystemPrompt(systemPrompt: string | undefined, thinkingBudget: number | null | undefined): string | undefined {
	if (thinkingBudget === undefined) return systemPrompt

	let budgetHint: string
	if (thinkingBudget === 0) {
		budgetHint = 'Do not use extended thinking or reasoning. Answer directly without a thinking process.'
	} else if (thinkingBudget === null) {
		budgetHint = 'You may use extended thinking and reasoning without any token limit.'
	} else {
		budgetHint = `You have a thinking budget of ${thinkingBudget} tokens for reasoning before giving your answer.`
	}

	return systemPrompt ? `${budgetHint}\n\n${systemPrompt}` : budgetHint
}

export function GetSession(context: LlamaContext, systemPrompt: string | undefined, thinkingBudget?: number | null): TResultCode<LlamaChatSession> {
	try {
		return {
			ok: true,
			result: new LlamaChatSession({
				contextSequence: context.getSequence(),
				systemPrompt: buildSystemPrompt(systemPrompt, thinkingBudget),
			}),
		}
	} catch (err) {
		return { ok: false, error: `on create llama session: ${err}`, errorCode: 500 }
	}
}
