import type { FastifyInstance } from 'fastify'
import { CheckJsonSchema } from 'vv-ai-prompt-format'
import { CheckJsonResponseRequestDto, CheckJsonResponseResponseDto, type TCheckJsonResponseRequest, type TCheckJsonResponseResponse } from './dto'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TCheckJsonResponseRequest
		Reply: TCheckJsonResponseResponse
	}>(
		'/check/jsonresponse',
		{
			schema: {
				description: 'Validate JSON Schema only (without GBNF conversion)',
				tags: ['validation'],
				body: CheckJsonResponseRequestDto,
				response: {
					200: CheckJsonResponseResponseDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST.CHECK.JSONRESPONSE.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			const logMsg = (msg: string) => `[from ${ip}] ${msg}`

			try {
				const { schema } = req.body

				// Validate JSON Schema structure only
				const schemaError = CheckJsonSchema(JSON.stringify(schema))
				if (schemaError) {
					res.send({
						error: `JSON Schema validation failed: ${schemaError}`,
					})
					Log().trace(pipe, logMsg(req.url))
					return
				}

				// Validation passed
				res.send({ error: '' })
				Log().trace(pipe, logMsg(req.url))
			} catch (err: any) {
				res.send({
					error: err.message || 'Failed to validate schema',
				})
				Log().trace(pipe, logMsg(req.url))
			}
		},
	)
}
