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
import { Log } from '../../log'

function logPromtRequest(
	statusCode: number,
	request: { system?: string; user: string },
	response: { data?: any; error?: string },
	duration: { promtMsec: number; queueMsec: number },
) {
	const requestText = JSON.stringify(request)
	const requestKB = (Buffer.byteLength(requestText) / 1024).toFixed(2)

	const responseText = JSON.stringify(response.data || response.error || '')
	const responseKB = (Buffer.byteLength(responseText) / 1024).toFixed(2)

	const message = `queue=${duration.queueMsec}ms, promt=${duration.promtMsec}ms, request=${requestKB}KB, response=${responseKB}KB`
	const extra = `Request:\n${requestText}\n\nResponse:\n${responseText}`
	const pipe = `POST.PROMT.${statusCode}`

	if (statusCode === 200) {
		Log().trace(pipe, message, extra)
	} else {
		Log().error(pipe, message, extra)
	}
}

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
				const llamaRes = await GetLama()
				if (!llamaRes.ok) {
					const duration = {
						promtMsec: durationPromtAfterQueue.getMsec(),
						queueMsec: 0,
					}
					res.code(llamaRes.errorCode).send({
						duration,
						error: llamaRes.error,
					})
					logPromtRequest(llamaRes.errorCode, body.message, { error: llamaRes.error }, duration)
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
					const duration = {
						promtMsec: durationPromtAfterQueue.getMsec(),
						queueMsec: 0,
					}
					res.code(generationParamsRes.errorCode).send({
						duration,
						error: generationParamsRes.error,
					})
					logPromtRequest(generationParamsRes.errorCode, body.message, { error: generationParamsRes.error }, duration)
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
							const duration = {
								promtMsec: durationPromt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(contextRes.errorCode).send({
								duration,
								error: contextRes.error,
							})
							logPromtRequest(contextRes.errorCode, body.message, { error: contextRes.error }, duration)
							return
						}
						const context = contextRes.result.context
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
							logPromtRequest(sessionRes.errorCode, body.message, { error: sessionRes.error }, duration)
							return
						}
						const session = sessionRes.result

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
							logPromtRequest(responseRes.errorCode, body.message, { error: responseRes.error }, duration)
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
							logPromtRequest(responseValidationRes.errorCode, body.message, { error: responseValidationRes.error }, duration)
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
						logPromtRequest(200, body.message, { data: responseJson }, duration)
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
						logPromtRequest(500, body.message, { error }, duration)
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
				logPromtRequest(500, body.message, { error }, duration)
			}
		},
	)
}
