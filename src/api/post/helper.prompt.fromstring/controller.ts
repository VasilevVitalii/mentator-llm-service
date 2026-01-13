import type { FastifyInstance } from 'fastify'
import { PromptConvFromString } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post(
		'/helper/prompt/fromstring',
		{
			schema: {
				description: 'Convert data from "string" to "prompt-format"',
				tags: ['helper'],
			},
		},
		async (req, res) => {
			const pipe = 'API.POST.PROMTLOAD.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			const logMsg = (msg: string) => `[from ${ip}] ${msg}`

			try {
				const { content } = req.body as { content: string }
				const promts = PromptConvFromString(content, 'json')

				res.header('Content-Type', 'application/json')
				res.send(JSON.stringify(promts))
				Log().trace(pipe, logMsg(req.url))
			} catch (err: any) {
				res.status(500).send({ error: err.message || 'Failed to parse promt' })
				Log().error(pipe, logMsg(req.url), err.message)
			}
		},
	)
}
