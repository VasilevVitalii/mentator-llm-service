import type { FastifyInstance } from 'fastify'
import { Log } from '../../log'

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
	fastify.get('/api/example/format', async (req, res) => {
		const pipe = 'GET.EXAMPLE.FORMAT.200'
		res.header('Content-Type', 'application/json')
		res.send(EXAMPLE_FORMAT)
		Log().trace(pipe, req.url)
	})
}
