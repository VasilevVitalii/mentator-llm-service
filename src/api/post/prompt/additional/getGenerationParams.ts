import type { Llama, LlamaGrammar } from 'node-llama-cpp'
import { ConvertJsonSchemaToGbnf } from 'vv-ai-prompt-format'
import type { TResultCode } from '../../../../tresult'
import type { TPostPromptRequest } from '../dto'
import type { TConfig } from '../../../../config'

type TPromptFormat = NonNullable<TPostPromptRequest['format']>

export type TGenerationParams = {
	temperature: number
	topP: number
	topK: number
	minP: number
	maxTokens: number
	repeatPenalty: {
		penalty: number
		penalizeNewLine: boolean
		frequencyPenalty: number
		presencePenalty: number
		lastTokens?: number
	}
	mirostat?: {
		version: number
		tau: number
		eta: number
	}
	stopSequences?: string[]
	seed?: number
	trimWhitespaceSuffix?: boolean
	grammar?: LlamaGrammar
}

export async function getGenerationParams(llama: Llama, options: TConfig['defaultOptions'], format?: TPromptFormat): Promise<TResultCode<TGenerationParams>> {
	try {
		const repeatPenalty: TGenerationParams['repeatPenalty'] = {
			penalty: options.repeatPenalty,
			penalizeNewLine: options.penalizeNewline,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
		}
		if (options.repeatPenaltyNum > 0) {
			repeatPenalty.lastTokens = options.repeatPenaltyNum
		}
		const generationParams: TGenerationParams = {
			temperature: options.temperature,
			topP: options.topP,
			topK: options.topK,
			minP: options.minP,
			maxTokens: options.maxTokens,
			repeatPenalty,
		}
		if (options.mirostat > 0) {
			generationParams.mirostat = {
				version: options.mirostat,
				tau: options.mirostatTau,
				eta: options.mirostatEta,
			}
		}
		if (options.stopSequences && options.stopSequences.length > 0) {
			generationParams.stopSequences = options.stopSequences
		}
		if (options.seed !== undefined) {
			generationParams.seed = options.seed
		}
		if (options.trimWhitespace) {
			generationParams.trimWhitespaceSuffix = true
		}

		if (format?.useGrammar && format.jsonSchema) {
			const gbnfResult = ConvertJsonSchemaToGbnf(format.jsonSchema)
			if ('error' in gbnfResult) {
				return { ok: false, error: `on convert grammar: ${gbnfResult.error}`, errorCode: 400 }
			}
			try {
				generationParams.grammar = await llama.createGrammarForJsonSchema(gbnfResult.result)
			} catch (err) {
				return { ok: false, error: `on create llama grammar: ${err}`, errorCode: 400 }
			}
		}

		return { ok: true, result: generationParams }
	} catch (err) {
		return { ok: false, error: `on create options: ${err}`, errorCode: 500 }
	}
}
