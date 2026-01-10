import type { FastifyInstance } from 'fastify'
import { ConvertJsonSchemaToGbnf, CheckJsonSchema } from 'vv-ai-promt-store'
import { CheckFormatRequestDto, CheckFormatResponseDto, type TCheckFormatRequest, type TCheckFormatResponse } from './dto'
import { Log } from '../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TCheckFormatRequest
		Reply: TCheckFormatResponse
	}>(
		'/api/checkformat',
		{
			schema: {
				description: 'Validate JSON Schema',
				tags: ['validation'],
				body: CheckFormatRequestDto,
				response: {
					200: CheckFormatResponseDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST.CHECKFORMAT.200'
			const ip = req.ip || req.socket.remoteAddress || 'unknown'
			const logMsg = (msg: string) => `[from ${ip}] ${msg}`

			try {
				const { schema } = req.body

				// Step 1: Validate JSON Schema structure
				const schemaError = CheckJsonSchema(JSON.stringify(schema))
				if (schemaError) {
					res.send({
						error: `JSON Schema validation failed: ${schemaError}`,
					})
					Log().trace(pipe, logMsg(req.url))
					return
				}

				// Step 2: Validate GBNF conversion
				const gbnfResult = ConvertJsonSchemaToGbnf(schema)
				if ('error' in gbnfResult) {
					res.send({
						error: `GBNF conversion failed: ${gbnfResult.error}`,
					})
					Log().trace(pipe, logMsg(req.url))
					return
				}

				// Both validations passed
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
