import type { FastifyInstance } from 'fastify'
import { GetModelsResponseDto, type TGetModelsResponse } from './dto'
import { ModelManager } from '../../../modelManager'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetModelsResponse
	}>(
		'/state/models',
		{
			schema: {
				description: 'Get list of available models',
				tags: ['state'],
				response: {
					200: GetModelsResponseDto,
				},
			},
		},
		async (req, res) => {
			const models = ModelManager().getModelList()
			res.send({ models })
		},
	)
}
