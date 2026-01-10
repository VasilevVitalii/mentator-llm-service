import type { FastifyInstance } from 'fastify'
import { defValJson } from 'vv-ai-promt-store'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get('/api/example/optionsjson', async (req, res) => {
		const pipe = 'API.GET.EXAMPLE.OPTIONSJSON.200'
		const ip = req.ip || req.socket.remoteAddress || 'unknown'
		res.header('Content-Type', 'application/json')
		res.send(JSON.stringify(defValJson, null, 2))
		Log().trace(pipe, `[from ${ip}] ${req.url}`)
	})
}
