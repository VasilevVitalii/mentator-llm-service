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
import { PromptOptionsParse } from 'vv-ai-prompt-format'
import { Log } from '../../../log'
import { Db } from '../../../db'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostPromptRequest
		Reply: TPostPromptResponse | TPostPromptResponseBad
	}>(
		'/prompt',
		{
			schema: {
				// @ts-expect-error - swagger plugin extends FastifySchema
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
			const allowSavePrompt = fastify.appConfig.log.savePrompt
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
					Log().error(pipe, log, llamaRes.error)
					await Db().editSavePrompt(llamaRes.errorCode, body, errResponse, duration)
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
					const errResponse = {
						duration,
						error: generationParamsRes.error,
					}
					res.code(generationParamsRes.errorCode).send(errResponse)
					Log().error(pipe, log, generationParamsRes.error)
					await Db().editSavePrompt(generationParamsRes.errorCode, body, errResponse, duration)
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
							const errResponse = {
								duration,
								error: contextRes.error,
							}
							res.code(contextRes.errorCode).send(errResponse)
							Log().error(pipe, log, contextRes.error)
							await Db().editSavePrompt(contextRes.errorCode, body, errResponse, duration)
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
							const errResponse = {
								duration,
								error: sessionRes.error,
							}
							res.code(sessionRes.errorCode).send(errResponse)
							Log().error(pipe, log, sessionRes.error)
							await Db().editSavePrompt(sessionRes.errorCode, body, errResponse, duration)
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
							const errResponse = {
								duration,
								error: responseRes.error,
							}
							res.code(responseRes.errorCode).send(errResponse)
							Log().error(pipe, log, responseRes.error)
							await Db().editSavePrompt(responseRes.errorCode, body, errResponse, duration)
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
								const errResponse = {
									duration,
									error: responseValidationRes.error,
								}
								res.code(responseValidationRes.errorCode).send(errResponse)
								Log().error(pipe, log, responseValidationRes.error)
								await Db().editSavePrompt(responseValidationRes.errorCode, body, errResponse, duration)
								return
							}
						}

						const duration = {
							promptMsec: durationPrompt.getMsec(),
							queueMsec: queueMsec,
						}
						const okResponse = {
							duration,
							result: {
								loadModelStatus: loadModelStatus,
								data: responseJson,
							},
						}
						res.code(200).send(okResponse)
						Log().debug(pipe, log, JSON.stringify({duration, loadModelStatus}))
						if (fastify.appConfig.log.savePrompt) {
							await Db().editSavePrompt(200, body, okResponse, duration)
						}
					} catch (err) {
						const duration = {
							promptMsec: durationPrompt.getMsec(),
							queueMsec: queueMsec,
						}
						const error = `${err}`
						const errResponse = {
							duration,
							error,
						}
						res.code(500).send(errResponse)
						Log().error(pipe, log, error)
						await Db().editSavePrompt(500, body, errResponse, duration)
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
				const errResponse = {
					duration,
					error,
				}
				res.code(500).send(errResponse)
				Log().error(pipe, log, error)
				await Db().editSavePrompt(500, body, errResponse, duration)
			}
		},
	)
}
