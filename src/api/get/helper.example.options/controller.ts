import type { FastifyInstance } from 'fastify'
import { defVal } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get(
		'/helper/example/options',
		{
			schema: {
				description: 'Get example LLM options for standart response',
				tags: ['helper'],
			},
		},
		async (req, res) => {
			const pipe = 'API.GET.EXAMPLE.OPTIONS.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			res.header('Content-Type', 'application/json')
			res.send(JSON.stringify(defVal, null, 2))
			Log().trace(pipe, `[from ${ip}] ${req.url}`)
		},
	)
}
