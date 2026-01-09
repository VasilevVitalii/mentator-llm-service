import type { FastifyInstance } from 'fastify'
import { convertJsonSchemaToGbnf } from 'vv-ai-promt-store'
import { CheckFormatRequestDto, CheckFormatResponseDto, type TCheckFormatRequest, type TCheckFormatResponse } from './dto'
import { Log } from '../../log'
import Ajv from 'ajv'

const ajv = new Ajv({ strict: false, allErrors: true })

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
			const pipe = 'POST.CHECKFORMAT.200'

			try {
				const { schema } = req.body

				// Step 1: Validate JSON Schema with AJV
				try {
					ajv.compile(schema)
				} catch (err: any) {
					res.send({
						error: `JSON Schema validation failed: ${err.message || 'Invalid JSON Schema'}`,
					})
					Log().trace(pipe, req.url)
					return
				}

				// Step 2: Validate GBNF conversion
				const gbnfResult = convertJsonSchemaToGbnf(schema)
				if ('error' in gbnfResult) {
					res.send({
						error: `GBNF conversion failed: ${gbnfResult.error}`,
					})
					Log().trace(pipe, req.url)
					return
				}

				// Both validations passed
				res.send({ error: '' })
				Log().trace(pipe, req.url)
			} catch (err: any) {
				res.send({
					error: err.message || 'Failed to validate schema',
				})
				Log().trace(pipe, req.url)
			}
		},
	)
}
