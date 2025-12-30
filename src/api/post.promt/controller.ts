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
import { GetResponse } from './additional/getResponse'
import { GetResponseValidation } from './additional/getResponseValidation'
import { QueuePromt } from '../../queue'

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
			const durationPromtAfterQueue = new Duration()
			const body = req.body
			const queue = QueuePromt()

			try {
				// Validate parameters before entering the queue
				const llamaRes = await GetLama()
				if (!llamaRes.ok) {
					res.code(llamaRes.errorCode).send({
						duration: {
							promtMsec: durationPromtAfterQueue.getMsec(),
							queueMsec: 0,
						},
						error: llamaRes.error,
					})
					return
				}
				const llama = llamaRes.result

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
						duration: {
							promtMsec: durationPromtAfterQueue.getMsec(),
							queueMsec: 0,
						},
						error: generationParamsRes.error,
					})
					return
				}
				const generationParams = generationParamsRes.result

				const durationPromtAfterQueueMsec = durationPromtAfterQueue.getMsec()
				const durationQueue = new Duration()

				await queue.add(async () => {
					const queueMsec = durationQueue.getMsec()
					const durationPromt = new Duration(durationPromtAfterQueueMsec)

					try {
						const contextRes = await GetContext(llama, body.model)
						if (!contextRes.ok) {
							res.code(contextRes.errorCode).send({
								duration: {
									promtMsec: durationPromt.getMsec(),
									queueMsec: queueMsec,
								},
								error: contextRes.error,
							})
							return
						}
						const context = contextRes.result.context
						const loadModelStatus = contextRes.result.loadModelStatus

						const sessionRes = GetSession(context, body.message.system)
						if (!sessionRes.ok) {
							res.code(sessionRes.errorCode).send({
								duration: {
									promtMsec: durationPromt.getMsec(),
									queueMsec: queueMsec,
								},
								error: sessionRes.error,
							})
							return
						}
						const session = sessionRes.result

						const responseRes = await GetResponse(session, body.message.user, generationParams, body.durationMsec)
						if (!responseRes.ok) {
							res.code(responseRes.errorCode).send({
								duration: {
									promtMsec: durationPromt.getMsec(),
									queueMsec: queueMsec,
								},
								error: responseRes.error,
							})
							return
						}
						const responseJson = responseRes.result

						const responseValidationRes = GetResponseValidation(responseJson, body.format?.jsonSchema)
						if (!responseValidationRes.ok) {
							res.code(responseValidationRes.errorCode).send({
								duration: {
									promtMsec: durationPromt.getMsec(),
									queueMsec: queueMsec,
								},
								error: responseValidationRes.error,
							})
							return
						}

						res.code(200).send({
							duration: {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							},
							result: {
								loadModelStatus: loadModelStatus,
								data: responseJson,
							},
						})
					} catch (err) {
						res.code(500).send({
							duration: {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							},
							error: `${err}`,
						})
					}
				})
			} catch (err) {
				res.code(500).send({
					duration: {
						promtMsec: 0,
						queueMsec: 0,
					},
					error: `${err}`,
				})
			}
		},
	)
}
