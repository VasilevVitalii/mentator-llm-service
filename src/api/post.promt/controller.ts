import type { FastifyInstance } from 'fastify'
import { PromtRequestDto, PromtResponseDto, type TPromtRequest, type TPromtResponse } from './dto'
import { PromtResponseBadDto, type TPromtResponseBad } from '../responseDto'
import { GetContext } from './additional/getContext'
import { GetLama } from './additional/getLama'
import { getGenerationParams } from './additional/getGenerationParams'
import { Duration } from '../duration'
import { GetSession } from './additional/getSession'
import { GetResponse } from './additional/getResponse'
import { GetResponseValidation } from './additional/getResponseValidation'
import { QueuePromt } from '../../queue'
import { saveHist } from './additional/saveHist'
import { PromtOptionsParse } from 'vv-ai-promt-store'

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
			const allowSavePromtExtra = fastify.appConfig.log.savePromt

			try {
				const llamaRes = await GetLama()
				if (!llamaRes.ok) {
					const duration = {
						promtMsec: durationPromtAfterQueue.getMsec(),
						queueMsec: 0,
					}
					const errResponse = {
						duration,
						error: llamaRes.error,
					}
					res.code(llamaRes.errorCode).send(errResponse)
					await saveHist(llamaRes.errorCode, body, errResponse, duration, allowSavePromtExtra)
					return
				}
				const llama = llamaRes.result

				// Merge default options with request options and validate
				const mergedOptions = PromtOptionsParse(
					'json',
					{
						...fastify.appConfig.defaultOptions,
						...body.options,
					},
					true
				)

				const generationParamsRes = await getGenerationParams(
					llama,
					mergedOptions,
					body.format,
				)
				if (!generationParamsRes.ok) {
					const duration = {
						promtMsec: durationPromtAfterQueue.getMsec(),
						queueMsec: 0,
					}
					res.code(generationParamsRes.errorCode).send({
						duration,
						error: generationParamsRes.error,
					})
					await saveHist(generationParamsRes.errorCode, body, { duration, error: generationParamsRes.error }, duration, allowSavePromtExtra)
					return
				}
				const generationParams = generationParamsRes.result

				const durationPromtAfterQueueMsec = durationPromtAfterQueue.getMsec()
				const durationQueue = new Duration()

				await queue.add(async () => {
					const queueMsec = durationQueue.getMsec()
					const durationPromt = new Duration(durationPromtAfterQueueMsec)

					let context: any = undefined
					let session: any = undefined
					try {
						const contextRes = await GetContext(llama, body.model)
						if (!contextRes.ok) {
							const duration = {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(contextRes.errorCode).send({
								duration,
								error: contextRes.error,
							})
							await saveHist(contextRes.errorCode, body, { duration, error: contextRes.error }, duration, allowSavePromtExtra)
							return
						}
						context = contextRes.result.context
						const loadModelStatus = contextRes.result.loadModelStatus

						const sessionRes = GetSession(context, body.message.system)
						if (!sessionRes.ok) {
							const duration = {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(sessionRes.errorCode).send({
								duration,
								error: sessionRes.error,
							})
							await saveHist(sessionRes.errorCode, body, { duration, error: sessionRes.error }, duration, allowSavePromtExtra)
							return
						}
						session = sessionRes.result

						const responseRes = await GetResponse(session, body.message.user, generationParams, body.durationMsec)
						if (!responseRes.ok) {
							const duration = {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(responseRes.errorCode).send({
								duration,
								error: responseRes.error,
							})
							await saveHist(responseRes.errorCode, body, { duration, error: responseRes.error }, duration, allowSavePromtExtra)
							return
						}
						const responseJson = responseRes.result

						const responseValidationRes = GetResponseValidation(responseJson, body.format?.jsonSchema)
						if (!responseValidationRes.ok) {
							const duration = {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(responseValidationRes.errorCode).send({
								duration,
								error: responseValidationRes.error,
							})
							await saveHist(responseValidationRes.errorCode, body, { duration, error: responseValidationRes.error }, duration, allowSavePromtExtra)
							return
						}

						const duration = {
							promtMsec: durationPromt.getMsec(),
							queueMsec: queueMsec,
						}
						res.code(200).send({
							duration,
							result: {
								loadModelStatus: loadModelStatus,
								data: responseJson,
							},
						})
						await saveHist(200, body, { duration, result: { loadModelStatus, data: responseJson } }, duration, allowSavePromtExtra)
					} catch (err) {
						const duration = {
							promtMsec: durationPromt.getMsec(),
							queueMsec: queueMsec,
						}
						const error = `${err}`
						res.code(500).send({
							duration,
							error,
						})
						await saveHist(500, body, { duration, error }, duration, allowSavePromtExtra)
					} finally {
						if (session) {
							session.dispose({ disposeSequence: true })
						}
						if (context) {
							await context.dispose()
						}
					}
				})
			} catch (err) {
				const duration = {
					promtMsec: 0,
					queueMsec: 0,
				}
				const error = `${err}`
				res.code(500).send({
					duration,
					error,
				})
				await saveHist(500, body, { duration, error }, duration, allowSavePromtExtra)
			}
		},
	)
}
