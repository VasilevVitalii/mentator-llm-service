import type { FastifyInstance } from 'fastify'
import { StatResponseDto, type TStatResponse } from './dto'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TStatResponse
	}>(
		'/stat',
		{
			schema: {
				description: 'Get service statistics',
				tags: ['service'],
				response: {
					200: StatResponseDto,
				},
			},
		},
		async (req, res) => {
			res.code(200).send({
				uptime: process.uptime(),
				availableModels: ['model1.gguf', 'model2.gguf'], // TODO: scan modelDir
				currentModel: null, // TODO: get from model manager
			})
		},
	)
}
