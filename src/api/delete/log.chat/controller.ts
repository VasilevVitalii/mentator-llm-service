import type { FastifyInstance } from 'fastify'
import {
	DeleteLogChatResponseDto,
	DeleteLogChatResponseBadDto,
	type TDeleteLogChatResponse,
	type TDeleteLogChatResponseBad,
} from './dto'
import { Db } from '../../../db'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.delete<{
		Reply: TDeleteLogChatResponse | TDeleteLogChatResponseBad
	}>(
		'/log/chat',
		{
			schema: {
				description: 'Clear all chat logs (prompt table)',
				tags: ['log'],
				response: {
					200: DeleteLogChatResponseDto,
					500: DeleteLogChatResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.DELETE /log/chat'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const db = Db()
				const deleted = await db.editClearChatLogs()

				res.send({ deleted })
				Log().debug(pipe, log, `deleted ${deleted} chat log records`)
			} catch (err: any) {
				const error = err.message || 'Failed to clear chat logs'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
