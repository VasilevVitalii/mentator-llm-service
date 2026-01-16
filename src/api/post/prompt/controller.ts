import type { FastifyInstance } from 'fastify'
import {
	PostPromptRequestDto,
	PostPromptResponseDto,
	PostPromptResponseBadDto,
	type TPostPromptRequest,
	type TPostPromptResponse,
	type TPostPromptResponseBad,
} from './dto'
import { GetContext } from './additional/getContext'
import { GetLama } from './additional/getLama'
import { getGenerationParams } from './additional/getGenerationParams'
import { Duration } from '../../duration'
import { GetSession } from './additional/getSession'
import { GetResponse } from './additional/getResponse'
import { GetResponseValidation } from './additional/getResponseValidation'
import { QueuePrompt } from '../../../queue'
import { saveHist } from './additional/saveHist'
import { PromptOptionsParse } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostPromptRequest
		Reply: TPostPromptResponse | TPostPromptResponseBad
	}>(
		'/prompt',
		{
			schema: {
				description: 'Process prompt and return JSON array',
				tags: ['main'],
				body: PostPromptRequestDto,
				response: {
					200: PostPromptResponseDto,
					400: PostPromptResponseBadDto,
					500: PostPromptResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /prompt'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			const durationPromptAfterQueue = new Duration()
			const body = req.body
			const queue = QueuePrompt()
			const allowSavePromptExtra = fastify.appConfig.log.savePrompt
			const ip = req.ip || req.socket.remoteAddress || 'unknown'

			try {
				const llamaRes = await GetLama()
				if (!llamaRes.ok) {
					const duration = {
						promptMsec: durationPromptAfterQueue.getMsec(),
						queueMsec: 0,
					}
					const errResponse = {
						duration,
						error: llamaRes.error,
					}
					res.code(llamaRes.errorCode).send(errResponse)
					await saveHist(llamaRes.errorCode, body, errResponse, duration, allowSavePromptExtra, ip)
					return
				}
				const llama = llamaRes.result

				// Merge default options with request options and validate
				const mergedOptions = PromptOptionsParse(
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
						promptMsec: durationPromptAfterQueue.getMsec(),
						queueMsec: 0,
					}
					res.code(generationParamsRes.errorCode).send({
						duration,
						error: generationParamsRes.error,
					})
					await saveHist(generationParamsRes.errorCode, body, { duration, error: generationParamsRes.error }, duration, allowSavePromptExtra, ip)
					return
				}
				const generationParams = generationParamsRes.result

				const durationPromptAfterQueueMsec = durationPromptAfterQueue.getMsec()
				const durationQueue = new Duration()

				await queue.add(async () => {
					const queueMsec = durationQueue.getMsec()
					const durationPrompt = new Duration(durationPromptAfterQueueMsec)

					let context: any = undefined
					let session: any = undefined
					try {
						const contextRes = await GetContext(llama, body.model)
						if (!contextRes.ok) {
							const duration = {
								promptMsec: durationPrompt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(contextRes.errorCode).send({
								duration,
								error: contextRes.error,
							})
							await saveHist(contextRes.errorCode, body, { duration, error: contextRes.error }, duration, allowSavePromptExtra, ip)
							return
						}
						context = contextRes.result.context
						const loadModelStatus = contextRes.result.loadModelStatus

						const sessionRes = GetSession(context, body.message.system)
						if (!sessionRes.ok) {
							const duration = {
								promptMsec: durationPrompt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(sessionRes.errorCode).send({
								duration,
								error: sessionRes.error,
							})
							await saveHist(sessionRes.errorCode, body, { duration, error: sessionRes.error }, duration, allowSavePromptExtra, ip)
							return
						}
						session = sessionRes.result

						// Only parse as JSON if format is specified
						const parseAsJson = body.format !== undefined && body.format !== null
						const responseRes = await GetResponse(session, body.message.user, generationParams, body.durationMsec, parseAsJson)
						if (!responseRes.ok) {
							const duration = {
								promptMsec: durationPrompt.getMsec(),
								queueMsec: queueMsec,
							}
							res.code(responseRes.errorCode).send({
								duration,
								error: responseRes.error,
							})
							await saveHist(responseRes.errorCode, body, { duration, error: responseRes.error }, duration, allowSavePromptExtra, ip)
							return
						}
						const responseJson = responseRes.result

						// Only validate if we parsed as JSON
						if (parseAsJson) {
							const responseValidationRes = GetResponseValidation(responseJson, body.format?.jsonSchema)
							if (!responseValidationRes.ok) {
								const duration = {
									promptMsec: durationPrompt.getMsec(),
									queueMsec: queueMsec,
								}
								res.code(responseValidationRes.errorCode).send({
									duration,
									error: responseValidationRes.error,
								})
								await saveHist(responseValidationRes.errorCode, body, { duration, error: responseValidationRes.error }, duration, allowSavePromptExtra, ip)
								return
							}
						}

						const duration = {
							promptMsec: durationPrompt.getMsec(),
							queueMsec: queueMsec,
						}
						res.code(200).send({
							duration,
							result: {
								loadModelStatus: loadModelStatus,
								data: responseJson,
							},
						})
						Log().trace(pipe, log)
						await saveHist(200, body, { duration, result: { loadModelStatus, data: responseJson } }, duration, allowSavePromptExtra, ip)
					} catch (err) {
						const duration = {
							promptMsec: durationPrompt.getMsec(),
							queueMsec: queueMsec,
						}
						const error = `${err}`
						res.code(500).send({
							duration,
							error,
						})
						Log().error(pipe, log, error)
						await saveHist(500, body, { duration, error }, duration, allowSavePromptExtra, ip)
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
					promptMsec: 0,
					queueMsec: 0,
				}
				const error = `${err}`
				res.code(500).send({
					duration,
					error,
				})
				Log().error(pipe, log, error)
				await saveHist(500, body, { duration, error }, duration, allowSavePromptExtra, ip)
			}
		},
	)
}
