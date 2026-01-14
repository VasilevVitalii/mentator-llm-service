import type { FastifyInstance } from 'fastify'
import { ConvertJsonSchemaToGbnf, CheckJsonSchema } from 'vv-ai-prompt-format'
import {
	PostCheckGbnfRequestDto,
	PostCheckGbnfResponseDto,
	PostCheckGbnfResponseBadDto,
	type TPostCheckGbnfRequest,
	type TPostCheckGbnfResponse,
	type TPostCheckGbnfResponseBad,
} from './dto'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostCheckGbnfRequest
		Reply: TPostCheckGbnfResponse | TPostCheckGbnfResponseBad
	}>(
		'/check/gbnf',
		{
			schema: {
				description: 'Validate JSON Schema and convert to GBNF',
				tags: ['validation'],
				body: PostCheckGbnfRequestDto,
				response: {
					200: PostCheckGbnfResponseDto,
					500: PostCheckGbnfResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /check/gbnf'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const { schema } = req.body

				// Step 1: Validate JSON Schema structure
				const schemaError = CheckJsonSchema(JSON.stringify(schema))
				if (schemaError) {
					res.send({
						error: `JSON Schema validation failed: ${schemaError}`,
					})
					Log().trace(pipe, log)
					return
				}

				// Step 2: Validate GBNF conversion
				const gbnfResult = ConvertJsonSchemaToGbnf(schema)
				if ('error' in gbnfResult) {
					res.send({
						error: `GBNF conversion failed: ${gbnfResult.error}`,
					})
					Log().trace(pipe, log)
					return
				}

				// Both validations passed
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
