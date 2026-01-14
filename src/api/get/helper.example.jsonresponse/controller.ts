import type { FastifyInstance } from 'fastify'
import {
	GetHelperExampleJsonresponseResponseDto,
	GetHelperExampleJsonresponseResponseBadDto,
	type TGetHelperExampleJsonresponseResponse,
	type TGetHelperExampleJsonresponseResponseBad,
} from './dto'
import { Log } from '../../../log'

const EXAMPLE_FORMAT = `{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "age": {
        "type": "number"
      }
    },
    "required": ["name", "age"],
    "additionalProperties": false
  }
}`

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetHelperExampleJsonresponseResponse | TGetHelperExampleJsonresponseResponseBad
	}>(
		'/helper/example/jsonresponse',
		{
			schema: {
				description: 'Get example response format (JSON schema format)',
				tags: ['helper'],
				response: {
					200: GetHelperExampleJsonresponseResponseDto,
					500: GetHelperExampleJsonresponseResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /helper/example/jsonresponse'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				res.send({ schema: EXAMPLE_FORMAT })
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get example JSON response format'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
