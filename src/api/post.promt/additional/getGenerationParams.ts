import type { Llama, LlamaGrammar } from 'node-llama-cpp'
import type { TResultCode } from '../../../tresult'
import type { TPromtRequest } from '../dto'
import type { TConfig } from '../../../config'
import { convertJsonSchemaToGbnf } from './convertJsonSchemaToGbnf'

type TPromtFormat = NonNullable<TPromtRequest['format']>

type TGenerationParams = {
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

export async function getGenerationParams(llama: Llama, options: TConfig['defaultOptions'], format?: TPromtFormat): Promise<TResultCode<TGenerationParams>> {
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
			try {
				const gbnfSchema = convertJsonSchemaToGbnf(format.jsonSchema)
				generationParams.grammar = await llama.createGrammarForJsonSchema(gbnfSchema)
			} catch (err) {
                return { ok: false, error: `on create grammar: ${err}`, errorCode: 400 }
            }
		}

		return { ok: true, result: generationParams }
	} catch (err) {
		return { ok: false, error: `on create options: ${err}`, errorCode: 500 }
	}
}
