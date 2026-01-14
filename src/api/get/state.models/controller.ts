import type { FastifyInstance } from 'fastify'
import {
	GetStateModelsResponseDto,
	GetStateModelsResponseBadDto,
	type TGetStateModelsResponse,
	type TGetStateModelsResponseBad,
} from './dto'
import { ModelManager } from '../../../modelManager'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetStateModelsResponse | TGetStateModelsResponseBad
	}>(
		'/state/models',
		{
			schema: {
				description: 'Get list of available models',
				tags: ['state'],
				response: {
					200: GetStateModelsResponseDto,
					500: GetStateModelsResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /state/models'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const models = ModelManager().getModelList()
				res.send({ models })
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get models list'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
