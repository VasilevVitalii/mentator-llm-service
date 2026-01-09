import type { FastifyInstance } from 'fastify'
import { defVal } from 'vv-ai-promt-store'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get('/api/example/options', async (req, res) => {
		const pipe = 'GET.EXAMPLE.OPTIONS.200'
		res.header('Content-Type', 'application/json')
		res.send(JSON.stringify(defVal, null, 2))
		Log().trace(pipe, req.url)
	})
}
