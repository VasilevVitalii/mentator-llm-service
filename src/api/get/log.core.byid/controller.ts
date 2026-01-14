import type { FastifyInstance } from 'fastify'
import {
	GetLogCoreByidRequestDto,
	GetLogCoreByidResponseDto,
	GetLogCoreByidResponseBadDto,
	type TGetLogCoreByidRequest,
	type TGetLogCoreByidResponse,
	type TGetLogCoreByidResponseBad,
} from './dto'
import { Db } from '../../../db'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Querystring: TGetLogCoreByidRequest
		Reply: TGetLogCoreByidResponse | TGetLogCoreByidResponseBad
	}>(
		'/log/core/byid',
		{
			schema: {
				description: 'Get core logs after specified ID',
				tags: ['log'],
				querystring: GetLogCoreByidRequestDto,
				response: {
					200: GetLogCoreByidResponseDto,
					500: GetLogCoreByidResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /log/core/byid'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const db = Db()
				const afterId = req.query.afterId ? parseInt(req.query.afterId, 10) : 0
				const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200

				const logs = await db.getCoreLogs(afterId, Math.min(limit, 200))

				res.send({ logs })
				//Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get core logs'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
