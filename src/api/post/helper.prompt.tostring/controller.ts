import type { FastifyInstance } from 'fastify'
import { PromptConvToString } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post(
		'/helper/prompt/tostring',
		{
			schema: {
				description: 'Convert data from "prompt-format" to "string"',
				tags: ['helper'],
			},
		},
		async (req, res) => {
			const pipe = 'API.POST.PROMTSTORE.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			const logMsg = (msg: string) => `[from ${ip}] ${msg}`

			try {
				const { promts } = req.body as { promts: any[] }
				const content = PromptConvToString(promts)

				res.header('Content-Type', 'text/plain')
				res.send(content)
				Log().trace(pipe, logMsg(req.url))
			} catch (err: any) {
				res.status(500).send({ error: err.message || 'Failed to store promt' })
				Log().error(pipe, logMsg(req.url), err.message)
			}
		},
	)
}
