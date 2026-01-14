import type { FastifyInstance } from 'fastify'
import {
	GetLogChatByidRequestDto,
	GetLogChatByidResponseDto,
	GetLogChatByidResponseBadDto,
	type TGetLogChatByidRequest,
	type TGetLogChatByidResponse,
	type TGetLogChatByidResponseBad,
} from './dto'
import { Db } from '../../../db'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Querystring: TGetLogChatByidRequest
		Reply: TGetLogChatByidResponse | TGetLogChatByidResponseBad
	}>(
		'/log/chat/byid',
		{
			schema: {
				description: 'Get chat logs (promt table) with optional filtering',
				tags: ['log'],
				querystring: GetLogChatByidRequestDto,
				response: {
					200: GetLogChatByidResponseDto,
					500: GetLogChatByidResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /log/chat/byid'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const db = Db()
				const afterId = req.query.afterId ? parseInt(req.query.afterId, 10) : 0
				const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200

				const logs = await db.getChatLogs(afterId, Math.min(limit, 200))

				res.send({ logs })
				//Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get chat logs'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
