import type { FastifyInstance } from 'fastify'
import { PromtStore } from 'vv-ai-promt-store'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post('/api/promtstore', async (req, res) => {
		const pipe = 'API.POST.PROMTSTORE.200'
		const ip = req.ip || req.socket.remoteAddress || 'unknown'
		const logMsg = (msg: string) => `[from ${ip}] ${msg}`

		try {
			const { promts } = req.body as { promts: any[] }
			const content = PromtStore(promts)

			res.header('Content-Type', 'text/plain')
			res.send(content)
			Log().trace(pipe, logMsg(req.url))
		} catch (err: any) {
			res.status(500).send({ error: err.message || 'Failed to store promt' })
			Log().error(pipe, logMsg(req.url), err.message)
		}
	})
}
