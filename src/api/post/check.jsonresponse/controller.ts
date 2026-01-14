import type { FastifyInstance } from 'fastify'
import { CheckJsonSchema } from 'vv-ai-prompt-format'
import {
	PostCheckJsonresponseRequestDto,
	PostCheckJsonresponseResponseDto,
	PostCheckJsonresponseResponseBadDto,
	type TPostCheckJsonresponseRequest,
	type TPostCheckJsonresponseResponse,
	type TPostCheckJsonresponseResponseBad,
} from './dto'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostCheckJsonresponseRequest
		Reply: TPostCheckJsonresponseResponse | TPostCheckJsonresponseResponseBad
	}>(
		'/check/jsonresponse',
		{
			schema: {
				description: 'Validate JSON Schema only (without GBNF conversion)',
				tags: ['validation'],
				body: PostCheckJsonresponseRequestDto,
				response: {
					200: PostCheckJsonresponseResponseDto,
					500: PostCheckJsonresponseResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /check/jsonresponse'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const { schema } = req.body

				// Validate JSON Schema structure only
				const schemaError = CheckJsonSchema(JSON.stringify(schema))
				if (schemaError) {
					res.send({
						error: `JSON Schema validation failed: ${schemaError}`,
					})
					Log().trace(pipe, log)
					return
				}

				// Validation passed
				res.send({ error: '' })
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to validate schema'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
