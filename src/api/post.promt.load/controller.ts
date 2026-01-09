import type { FastifyInstance } from 'fastify'
import { PromtLoad } from 'vv-ai-promt-store'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post('/api/promtload', async (req, res) => {
		const pipe = 'POST.PROMTLOAD.200'

		try {
			const { content } = req.body as { content: string }
			const promts = PromtLoad(content, 'json')

			res.header('Content-Type', 'application/json')
			res.send(JSON.stringify(promts))
			Log().trace(pipe, req.url)
		} catch (err: any) {
			res.status(500).send({ error: err.message || 'Failed to parse promt' })
			Log().error(pipe, req.url, err.message)
		}
	})
}
