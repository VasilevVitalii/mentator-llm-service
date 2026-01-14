import type { FastifyInstance } from 'fastify'
import {
	GetHelperExampleOptionsResponseDto,
	GetHelperExampleOptionsResponseBadDto,
	type TGetHelperExampleOptionsResponse,
	type TGetHelperExampleOptionsResponseBad,
} from './dto'
import { defVal } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetHelperExampleOptionsResponse | TGetHelperExampleOptionsResponseBad
	}>(
		'/helper/example/options',
		{
			schema: {
				description: 'Get example LLM options for standart response',
				tags: ['helper'],
				response: {
					200: GetHelperExampleOptionsResponseDto,
					500: GetHelperExampleOptionsResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /helper/example/options'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				res.header('Content-Type', 'application/json')
				res.send(JSON.stringify(defVal, null, 2))
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get example options'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
