import type { FastifyInstance } from 'fastify'
import { ChatLogsQueryDto, ChatLogsResponseDto, type TChatLogsQuery, type TChatLogsResponse } from './dto'
import { Db } from '../../../db'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Querystring: TChatLogsQuery
		Reply: TChatLogsResponse
	}>(
		'/log/chat/byid',
		{
			schema: {
				description: 'Get chat logs (promt table) with optional filtering',
				tags: ['log'],
				querystring: ChatLogsQueryDto,
				response: {
					200: ChatLogsResponseDto,
				},
			},
		},
		async (req, res) => {
			const db = Db()
			const afterId = req.query.afterId ? parseInt(req.query.afterId, 10) : 0
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200

			const logs = await db.getChatLogs(afterId, Math.min(limit, 200))

			res.code(200).send({ logs })
		},
	)
}
