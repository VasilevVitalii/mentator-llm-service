import type { FastifyInstance } from 'fastify'
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

				// Try to compile the schema
				ajv.compile(schema)

				res.send({ error: '' })
				Log().trace(pipe, req.url)
			} catch (err: any) {
				res.send({
					error: err.message || 'Invalid JSON Schema',
				})
				Log().trace(pipe, req.url)
			}
		},
	)
}
