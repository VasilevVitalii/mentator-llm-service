import type { FastifyInstance } from 'fastify'
import { PromtRequestDto, PromtResponseDto, type TPromtRequest, type TPromtResponse } from './dto'
import { getLlama, LlamaChatSession, type LlamaModel, type LlamaContext, type Llama } from 'node-llama-cpp'
import Ajv from 'ajv'
import { convertJsonSchemaToGbnf } from './additional/convertJsonSchemaToGbnf'
import { LoadContext } from './additional/loadContext'

let llama: Llama | null = null
const ajv = new Ajv()

/**
 * Convert standard JSON Schema to GBNF JSON Schema format
 */

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
				if (!llama) {
					llama = await getLlama()
				}
				const loadRes = await LoadContext(llama, body.model)
				if (!loadRes.ok) {
					//TODO errorCode from loadRes
					res.code(200).send({
						durationMsec: Date.now() - startTime,
						loadModelStatus: 'exists' as const,
						error: loadRes.error,
					})
					return
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
							//TODO errorCode 400
							console.error('Grammar creation error:', grammarError)
							res.code(200).send({
								durationMsec: Date.now() - startTime,
								loadModelStatus: loadRes.result.loadModelStatus,
								error: `Grammar creation error: ${grammarError.message}`,
							})
							return
						}
					}

					// Create chat session
					const session = new LlamaChatSession({
						contextSequence: loadRes.result.context.getSequence(),
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
						//TODO errorCode 400
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModelStatus: loadRes.result.loadModelStatus,
							error: `Failed to parse JSON response: ${parseError}`,
						})
						return
					}

					// Validate against JSON Schema if provided
					if (body.format?.jsonSchema) {
						const validate = ajv.compile(body.format.jsonSchema)
						const isValid = validate(resultArray)
						if (!isValid) {
							//TODO errorCode 400
							res.code(200).send({
								durationMsec: Date.now() - startTime,
								loadModelStatus: loadRes.result.loadModelStatus,
								error: `JSON Schema validation failed: ${validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ')}`,
							})
							return
						}
					}

					res.code(200).send({
						durationMsec: Date.now() - startTime,
						loadModelStatus: loadRes.result.loadModelStatus,
						result: resultArray,
					})
				} catch (generationError: any) {
					if (generationError.name === 'AbortError') {
						//TODO errorCode 400
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModelStatus: loadRes.result.loadModelStatus,
							error: `Generation timeout exceeded (${body.durationMsec}ms)`,
						})
					} else {
						console.error('Generation error:', generationError)
						//TODO errorCode 500
						res.code(200).send({
							durationMsec: Date.now() - startTime,
							loadModelStatus: loadRes.result.loadModelStatus,
							error: `Generation error: ${generationError.message}`,
						})
					}
				} finally {
					clearTimeout(timeoutId)
					// Dispose context to free memory
					if (loadRes.ok && loadRes.result.context) {
						await loadRes.result.context.dispose()
					}
				}
			} catch (error: any) {
				console.error('Controller error:', error)
				//TODO errorCode 500
				res.code(200).send({
					durationMsec: Date.now() - startTime,
					loadModelStatus: 'exists' as const,
					error: `Error: ${error.message}`,
				})
			}
		},
	)
}
