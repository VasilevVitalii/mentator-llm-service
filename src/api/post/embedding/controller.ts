import type { FastifyInstance } from 'fastify'
import {
	PostEmbeddingRequestDto,
	PostEmbeddingResponseDto,
	PostEmbeddingResponseBadDto,
	type TPostEmbeddingRequest,
	type TPostEmbeddingResponse,
	type TPostEmbeddingResponseBad,
} from './dto'
import { GetContext } from '../prompt/additional/getContext'
import { GetLama } from '../prompt/additional/getLama'
import { Duration } from '../../duration'
import { QueuePrompt } from '../../../queue'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostEmbeddingRequest
		Reply: TPostEmbeddingResponse | TPostEmbeddingResponseBad
	}>(
		'/embedding',
		{
			schema: {
				//@ts-ignore - swagger plugin extends FastifySchema
				description: 'Generate embedding vector for a text using a local LLM',
				tags: ['main'],
				body: PostEmbeddingRequestDto,
				response: {
					200: PostEmbeddingResponseDto,
					400: PostEmbeddingResponseBadDto,
					500: PostEmbeddingResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /embedding'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			const durationAfterQueue = new Duration()
			const body = req.body
			const queue = QueuePrompt()

			try {
				const llamaRes = await GetLama()
				if (!llamaRes.ok) {
					const duration = { promptMsec: durationAfterQueue.getMsec(), queueMsec: 0 }
					res.code(llamaRes.errorCode).send({ duration, error: llamaRes.error })
					Log().error(pipe, log, llamaRes.error)
					return
				}
				const llama = llamaRes.result

				const durationAfterQueueMsec = durationAfterQueue.getMsec()
				const durationQueue = new Duration()

				await queue.add(async () => {
					const queueMsec = durationQueue.getMsec()
					const durationPrompt = new Duration(durationAfterQueueMsec)

					let embeddingContext: any = undefined
					try {
						const contextRes = await GetContext(llama, body.model, body.gpulayer)
						if (!contextRes.ok) {
							const duration = { promptMsec: durationPrompt.getMsec(), queueMsec }
							res.code(contextRes.errorCode).send({ duration, error: contextRes.error })
							Log().error(pipe, log, contextRes.error)
							return
						}
						const { model, loadModelStatus } = contextRes.result

						embeddingContext = await model.createEmbeddingContext()
						const embeddingResult = await embeddingContext.getEmbeddingFor(body.message)
						const vector = Array.from(embeddingResult.vector) as number[]

						const duration = { promptMsec: durationPrompt.getMsec(), queueMsec }
						const okResponse = {
							duration,
							result: { loadModelStatus, data: vector },
						}
						res.code(200).send(okResponse)
						Log().debug(pipe, log, JSON.stringify({ duration, loadModelStatus, vectorLen: vector.length }))
					} catch (err) {
						const duration = { promptMsec: durationPrompt.getMsec(), queueMsec }
						const error = `${err}`
						res.code(500).send({ duration, error })
						Log().error(pipe, log, error)
					} finally {
						if (embeddingContext) {
							await embeddingContext.dispose()
						}
					}
				})
			} catch (err) {
				const duration = { promptMsec: 0, queueMsec: 0 }
				const error = `${err}`
				res.code(500).send({ duration, error })
				Log().error(pipe, log, error)
			}
		},
	)
}
