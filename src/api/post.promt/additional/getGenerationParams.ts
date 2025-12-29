import type { Llama, LlamaGrammar } from 'node-llama-cpp'
import type { TResultCode } from '../../../tresult'
import type { TPromtRequest } from '../dto'
import type { TConfig } from '../../../config'

type TPromtFormat = NonNullable<TPromtRequest['format']>

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

export function convertJsonSchemaToGbnf(schema: any): any {
	if (schema.type === 'array' && schema.items) {
		return {
			type: 'array' as const,
			items: convertJsonSchemaToGbnf(schema.items),
		}
	}
	if (schema.type === 'object' && schema.properties) {
		const properties: Record<string, any> = {}
		for (const [key, value] of Object.entries(schema.properties)) {
			properties[key] = convertJsonSchemaToGbnf(value as any)
		}

		return {
			type: 'object' as const,
			properties,
			additionalProperties: schema.additionalProperties === true ? true : false,
		}
	}
	if (schema.type === 'string') {
		return { type: 'string' as const }
	}
	if (schema.type === 'number') {
		return { type: 'number' as const }
	}
	if (schema.type === 'integer') {
		return { type: 'integer' as const }
	}
	if (schema.type === 'boolean') {
		return { type: 'boolean' as const }
	}
	if (schema.type === 'null') {
		return { type: 'null' as const }
	}
	if (schema.enum) {
		return { enum: schema.enum as readonly (string | number | boolean | null)[] }
	}
	if (schema.const !== undefined) {
		return { const: schema.const }
	}
	throw new Error(`Unsupported JSON Schema format: ${JSON.stringify(schema)}`)
}