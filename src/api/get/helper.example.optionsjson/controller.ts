import type { FastifyInstance } from 'fastify'
import {
	GetHelperExampleOptionsjsonResponseDto,
	GetHelperExampleOptionsjsonResponseBadDto,
	type TGetHelperExampleOptionsjsonResponse,
	type TGetHelperExampleOptionsjsonResponseBad,
} from './dto'
import { defValJson } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetHelperExampleOptionsjsonResponse | TGetHelperExampleOptionsjsonResponseBad
	}>(
		'/helper/example/optionsjson',
		{
			schema: {
				description: 'Get example LLM options for JSON-like response',
				tags: ['helper'],
				response: {
					200: GetHelperExampleOptionsjsonResponseDto,
					500: GetHelperExampleOptionsjsonResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /helper/example/optionsjson'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				res.header('Content-Type', 'application/json')
				res.send(JSON.stringify(defValJson, null, 2))
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get example options JSON'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
