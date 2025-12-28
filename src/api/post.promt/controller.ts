import type { FastifyInstance } from 'fastify'
import { PromtRequestDto, PromtResponseDto, type TPromtRequest, type TPromtResponse } from './dto'
import { getLlama, LlamaChatSession, type LlamaModel, type LlamaContext, type Llama } from 'node-llama-cpp'
import { ModelManager } from '../../modelManager'
import { join } from 'path'
import Ajv from 'ajv'

/*
1. Логирования никакого не надо, обработка ошибок самая простейшая с использованием console.error()
2. Загружденную модель хранить в памяти. инфу о том, какая модель загружена - хранить в контроллере
3. Загружать модель перед вопросом если это надо (возможно, уже загружена нужная модель()
4. Самостоятельно смапь параметры наших options и node-llama-cpp
5. Используем createGrammarForJsonSchema из node-llama-cpp. Это встроенная функция, которая НЕ требует llama инстанса
6. Резултьтат валидируем через TypeBox
7. Таймауты и durationMsec - node-llama-cpp поддерживает AbortController
*/

let currentModelName: string | null = null
let currentModel: LlamaModel | null = null
let currentContext: LlamaContext | null = null
let llama: Llama | null = null
const ajv = new Ajv()

/**
 * Convert standard JSON Schema to GBNF JSON Schema format
 */
function convertJsonSchemaToGbnf(schema: any): any {
	// Handle array type
	if (schema.type === 'array' && schema.items) {
		return {
			type: 'array' as const,
			items: convertJsonSchemaToGbnf(schema.items),
		}
	}

	// Handle object type
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

	// Handle primitive types
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

	// Handle enum
	if (schema.enum) {
		return { enum: schema.enum as readonly (string | number | boolean | null)[] }
	}

	// Handle const
	if (schema.const !== undefined) {
		return { const: schema.const }
	}

	// Fallback
	throw new Error(`Unsupported JSON Schema format: ${JSON.stringify(schema)}`)
}

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPromtRequest
		Reply: TPromtResponse
	}>(
		'/promt',
		{
			schema: {
				description: 'Process prompt and return JSON array',
				tags: ['prompt'],
				body: PromtRequestDto,
				response: {
					200: PromtResponseDto,
				},
			},
		},
		async (req, res) => {
			const startTime = Date.now()
			const body = req.body

			try {
				// Get model info from ModelManager
				const modelInfo = ModelManager().getModel(body.model)
				if (!modelInfo) {
					res.code(200).send({
						durationMsec: Date.now() - startTime,
						loadModel: 'exists' as const,
						error: `Model "${body.model}" not found`,
					})
					return
				}

				// Determine if we need to reload the model
				let loadStatus: 'reload' | 'load' | 'exists' = 'exists'
				const modelPath = join(ModelManager()['_modelDir'], modelInfo.relativeFileName)

				if (currentModelName !== body.model) {
					// Cleanup previous model
					if (currentContext) {
						await currentContext.dispose()
						currentContext = null
					}
					if (currentModel) {
						await currentModel.dispose()
						currentModel = null
					}

					loadStatus = currentModelName === null ? 'load' : 'reload'

					// Load new model
					llama = await getLlama()
					currentModel = await llama.loadModel({ modelPath })
					currentModelName = body.model
				}

				// Create new context for each request to avoid sequence exhaustion
				if (currentContext) {
					await currentContext.dispose()
				}
				currentContext = await currentModel!.createContext()

				// Ensure llama instance is available
				if (!llama) {
					llama = await getLlama()
				}

				// Merge default options with request options
				const config = fastify.initialConfig as any
				const mergedOptions = {
					...config.defaultOptions,
					...body.options,
				}

				// Create abort controller for timeout
				const abortController = new AbortController()
				const timeoutId = setTimeout(() => abortController.abort(), body.durationMsec)

				try {
					// Prepare repeat penalty parameters
					const repeatPenalty: any = {
						penalty: mergedOptions.repeatPenalty,
						penalizeNewLine: mergedOptions.penalizeNewline,
						frequencyPenalty: mergedOptions.frequencyPenalty,
						presencePenalty: mergedOptions.presencePenalty,
					}
					if (mergedOptions.repeatPenaltyNum > 0) {
						repeatPenalty.lastTokens = mergedOptions.repeatPenaltyNum
					}

					// Prepare generation parameters
					const generationParams: any = {
						temperature: mergedOptions.temperature,
						topP: mergedOptions.topP,
						topK: mergedOptions.topK,
						minP: mergedOptions.minP,
						maxTokens: mergedOptions.maxTokens,
						repeatPenalty,
					}

					// Add mirostat if enabled
					if (mergedOptions.mirostat > 0) {
						generationParams.mirostat = {
							version: mergedOptions.mirostat,
							tau: mergedOptions.mirostatTau,
							eta: mergedOptions.mirostatEta,
						}
					}

					// Add stop sequences
					if (mergedOptions.stopSequences && mergedOptions.stopSequences.length > 0) {
						generationParams.stopSequences = mergedOptions.stopSequences
					}

					// Add seed if provided
					if (mergedOptions.seed !== undefined) {
						generationParams.seed = mergedOptions.seed
					}

					// Add trim whitespace
					if (mergedOptions.trimWhitespace) {
						generationParams.trimWhitespaceSuffix = true
					}

					// Add grammar if format is specified with useGrammar
					if (body.format?.useGrammar && body.format.jsonSchema) {
						try {
							// Convert standard JSON Schema to GBNF format
							const gbnfSchema = convertJsonSchemaToGbnf(body.format.jsonSchema)
							generationParams.grammar = await llama.createGrammarForJsonSchema(gbnfSchema)
						} catch (grammarError: any) {
							console.error('Grammar creation error:', grammarError)
							res.code(200).send({
								durationMsec: Date.now() - startTime,
								loadModel: loadStatus,
								error: `Grammar creation error: ${grammarError.message}`,
							})
							return
						}
					}

					// Create chat session
					const session = new LlamaChatSession({
						contextSequence: currentContext!.getSequence(),
						systemPrompt: body.message.system,
					})

					// Generate response with abort signal
					const responseText = await session.prompt(body.message.user, {
						...generationParams,
						signal: abortController.signal,
					})

					// Parse and validate result
					let resultArray: any[]
					try {
						// Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
						let cleanedText = responseText.trim()
						const jsonMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
						if (jsonMatch && jsonMatch[1]) {
							cleanedText = jsonMatch[1].trim()
						}

						const parsed = JSON.parse(cleanedText)
						resultArray = Array.isArray(parsed) ? parsed : [parsed]
					} catch (parseError) {
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModel: loadStatus,
							error: `Failed to parse JSON response: ${parseError}`,
						})
						return
					}

					// Validate against JSON Schema if provided
					if (body.format?.jsonSchema) {
						const validate = ajv.compile(body.format.jsonSchema)
						const isValid = validate(resultArray)
						if (!isValid) {
							res.code(200).send({
								durationMsec: Date.now() - startTime,
								loadModel: loadStatus,
								error: `JSON Schema validation failed: ${validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ')}`,
							})
							return
						}
					}

					res.code(200).send({
						durationMsec: Date.now() - startTime,
						loadModel: loadStatus,
						result: resultArray,
					})
				} catch (generationError: any) {
					if (generationError.name === 'AbortError') {
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModel: loadStatus,
							error: `Generation timeout exceeded (${body.durationMsec}ms)`,
						})
					} else {
						console.error('Generation error:', generationError)
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModel: loadStatus,
							error: `Generation error: ${generationError.message}`,
						})
					}
				} finally {
					clearTimeout(timeoutId)
				}
			} catch (error: any) {
				console.error('Controller error:', error)
				res.code(200).send({
					durationMsec: Date.now() - startTime,
					loadModel: 'exists' as const,
					error: `Error: ${error.message}`,
				})
			}
		},
	)
}
