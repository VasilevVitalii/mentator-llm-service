import type { FastifyInstance } from 'fastify'
import { PromtStore } from 'vv-ai-promt-store'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post('/api/promtstore', async (req, res) => {
		const pipe = 'POST.PROMTSTORE.200'

		try {
			const { promts } = req.body as { promts: any[] }
			const content = PromtStore(promts)

			res.header('Content-Type', 'text/plain')
			res.send(content)
			Log().trace(pipe, req.url)
		} catch (err: any) {
			res.status(500).send({ error: err.message || 'Failed to store promt' })
			Log().error(pipe, req.url, err.message)
		}
	})
}
