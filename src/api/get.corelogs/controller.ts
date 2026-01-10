import type { FastifyInstance } from 'fastify'
import { CoreLogsResponseDto, type TCoreLogsResponse } from './dto'
import { Db } from '../../db'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Querystring: {
			afterId?: string
			limit?: string
		}
		Reply: TCoreLogsResponse
	}>(
		'/api/corelogs',
		{
			schema: {
				description: 'Get core logs after specified ID',
				tags: ['logs'],
				querystring: {
					type: 'object',
					properties: {
						afterId: { type: 'string' },
						limit: { type: 'string' },
					},
				},
				response: {
					200: CoreLogsResponseDto,
				},
			},
		},
		async (req, res) => {
			const db = Db()
			const afterId = req.query.afterId ? parseInt(req.query.afterId, 10) : 0
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200

			const logs = await db.getCoreLogs(afterId, Math.min(limit, 200))

			const response: TCoreLogsResponse = {
				logs,
			}

			res.code(200).send(response)
		},
	)
}
