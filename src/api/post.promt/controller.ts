import type { FastifyInstance } from 'fastify'
import { PromtRequestDto, PromtResponseDto, type TPromtRequest, type TPromtResponse } from './dto'
import { PromtResponseBadDto, type TPromtResponseBad } from '../responseDto'
import { LlamaChatSession } from 'node-llama-cpp'
import Ajv from 'ajv'
import { GetContext } from './additional/getContext'
import { GetLama } from './additional/getLama'
import { getGenerationParams } from './additional/getGenerationParams'
import { Duration } from '../duration'
import { GetSession } from './additional/getSession'

const ajv = new Ajv()

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPromtRequest
		Reply: TPromtResponse | TPromtResponseBad
	}>(
		'/promt',
		{
			schema: {
				description: 'Process prompt and return JSON array',
				tags: ['prompt'],
				body: PromtRequestDto,
				response: {
					200: PromtResponseDto,
					400: PromtResponseBadDto,
					500: PromtResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const duration = new Duration()
			const body = req.body

			const llamaRes = await GetLama()
			if (!llamaRes.ok) {
				res.code(llamaRes.errorCode).send({
					durationMsec: duration.getMsec(),
					error: llamaRes.error,
				})
				return
			}
			const llama = llamaRes.result

			const contextRes = await GetContext(llama, body.model)
			if (!contextRes.ok) {
				res.code(contextRes.errorCode).send({
					durationMsec: duration.getMsec(),
					error: contextRes.error,
				})
				return
			}
			const context = contextRes.result.context
			const loadModelStatus = contextRes.result.loadModelStatus

			const generationParamsRes = await getGenerationParams(
				llama,
				{
					...fastify.appConfig.defaultOptions,
					...body.options,
				},
				body.format,
			)
			if (!generationParamsRes.ok) {
				res.code(generationParamsRes.errorCode).send({
					durationMsec: duration.getMsec(),
					error: generationParamsRes.error,
				})
				return
			}
			const generationParams = generationParamsRes.result

			const sessionRes = GetSession(context, body.message.system)
			if (!sessionRes.ok) {
				res.code(sessionRes.errorCode).send({
					durationMsec: duration.getMsec(),
					error: sessionRes.error,
				})
				return
			}
			const session = sessionRes.result

			let timeoutId = undefined as NodeJS.Timeout | undefined

			try {
				const abortController = new AbortController()
				timeoutId = setTimeout(() => abortController.abort(), body.durationMsec)

				// Generate response with abort signal
				const responseText = await session.prompt(body.message.user, {
					...generationParams,
					signal: abortController.signal,
				})

				// Parse and validate result
				let parsedData: any
				try {
					// Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
					let cleanedText = responseText.trim()
					const jsonMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
					if (jsonMatch && jsonMatch[1]) {
						cleanedText = jsonMatch[1].trim()
					}

					parsedData = JSON.parse(cleanedText)
				} catch (parseError) {
					res.code(400).send({
						durationMsec: duration.getMsec(),
						error: `Failed to parse JSON response: ${parseError}`,
					})
					return
				}

				// Validate against JSON Schema if provided
				if (body.format?.jsonSchema) {
					const validate = ajv.compile(body.format.jsonSchema)
					const isValid = validate(parsedData)
					if (!isValid) {
						res.code(400).send({
							durationMsec: duration.getMsec(),
							error: `JSON Schema validation failed: ${validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ')}`,
						})
						return
					}
				}

				res.code(200).send({
					durationMsec: duration.getMsec(),
					result: {
						loadModelStatus: loadModelStatus,
						data: parsedData,
					},
				})
			} catch (generationError: any) {
				if (generationError.name === 'AbortError') {
					res.code(400).send({
						durationMsec: duration.getMsec(),
						error: `Generation timeout exceeded (${body.durationMsec}ms)`,
					})
				} else {
					console.error('Generation error:', generationError)
					res.code(500).send({
						durationMsec: duration.getMsec(),
						error: `Generation error: ${generationError.message}`,
					})
				}
			} finally {
				if (timeoutId) {
					clearTimeout(timeoutId)
				}
				if (context) {
					await context.dispose()
				}
			}
		},
	)
}
