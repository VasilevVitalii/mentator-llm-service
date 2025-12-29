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
			try {
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

				const responseRes = await GetResponse(session, body.message.user, generationParams, body.durationMsec)
				if (!responseRes.ok) {
					res.code(responseRes.errorCode).send({
						durationMsec: duration.getMsec(),
						error: responseRes.error,
					})
					return
				}
				const responseJson = responseRes.result

				const responseValidationRes = GetResponseValidation(responseJson, body.format?.jsonSchema)
				if (!responseValidationRes.ok) {
					res.code(responseValidationRes.errorCode).send({
						durationMsec: duration.getMsec(),
						error: responseValidationRes.error,
					})
					return
				}

				res.code(200).send({
					durationMsec: duration.getMsec(),
					result: {
						loadModelStatus: loadModelStatus,
						data: responseJson,
					},
				})
			} catch (err) {
				res.code(500).send({
					durationMsec: 0,
					error: `${err}`,
				})
			}
		},
	)
}
