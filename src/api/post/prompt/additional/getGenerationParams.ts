import type { Llama, LlamaGrammar } from 'node-llama-cpp'
import { ToPromptOptionsLlamaCpp } from 'vv-ai-prompt-format'
import type { TResultCode } from '../../../../tresult'
import type { TPostPromptRequest } from '../dto'
import type { TConfig } from '../../../../config'

type TPromptFormat = NonNullable<TPostPromptRequest['format']>

export type TGenerationParams = {
	temperature?: number
	topP?: number
	topK?: number
	minP?: number
	maxTokens?: number
	repeatPenalty?: false | {
		penalty?: number
		penalizeNewLine?: boolean
		frequencyPenalty?: number
		presencePenalty?: number
		lastTokens?: number
	}
	customStopTriggers?: (string | string[])[]
	seed?: number
	trimWhitespaceSuffix?: boolean
	grammar?: LlamaGrammar
	evaluationPriority?: 1 | 2 | 3 | 4 | 5
	contextShiftSize?: number
	disableContextShift?: boolean
}

export async function getGenerationParams(llama: Llama, options: TConfig['defaultOptions'], format?: TPromptFormat): Promise<TResultCode<TGenerationParams>> {
	try {
		// Convert options to LlamaCpp format using library function
		// Don't pass jsonSchema yet - we'll handle grammar separately
		const baseParams = ToPromptOptionsLlamaCpp(options)

		// If grammar is needed, create LlamaGrammar object from JSON Schema
		let grammar: LlamaGrammar | undefined
		if (format?.useGrammar && format.jsonSchema) {
			try {
				grammar = await llama.createGrammarForJsonSchema(format.jsonSchema)
			} catch (err) {
				return { ok: false, error: `on create llama grammar: ${err}`, errorCode: 400 }
			}
		}

		// Validate and clamp evaluationPriority to allowed range
		let evaluationPriority: 1 | 2 | 3 | 4 | 5 | undefined = undefined
		if (baseParams.evaluationPriority !== undefined) {
			const priority = Math.max(1, Math.min(5, Math.round(baseParams.evaluationPriority)))
			evaluationPriority = priority as 1 | 2 | 3 | 4 | 5
		}

		// Remove tokenBias as it's not compatible with node-llama-cpp types
		const { tokenBias, ...compatibleParams } = baseParams

		// Create final parameters object
		const generationParams: TGenerationParams = {
			...compatibleParams,
			evaluationPriority,
			grammar
		}

		return { ok: true, result: generationParams }
	} catch (err) {
		return { ok: false, error: `on create options: ${err}`, errorCode: 500 }
	}
}
