import type { FastifyInstance } from 'fastify'
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
	fastify.get(
		'/helper/example/jsonresponse',
		{
			schema: {
				description: 'Get example response format (JSON schema format)',
				tags: ['helper'],
			},
		},
		async (req, res) => {
			const pipe = 'API.GET.EXAMPLE.FORMAT.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			res.header('Content-Type', 'application/json')
			res.send(EXAMPLE_FORMAT)
			Log().trace(pipe, `[from ${ip}] ${req.url}`)
		},
	)
}
