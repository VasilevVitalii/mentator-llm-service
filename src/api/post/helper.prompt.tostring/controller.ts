import type { FastifyInstance } from 'fastify'
import {
	PostHelperPromptTostringRequestDto,
	PostHelperPromptTostringResponseDto,
	PostHelperPromptTostringResponseBadDto,
	type TPostHelperPromptTostringRequest,
	type TPostHelperPromptTostringResponse,
	type TPostHelperPromptTostringResponseBad,
} from './dto'
import { PromptConvToString } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostHelperPromptTostringRequest
		Reply: TPostHelperPromptTostringResponse | TPostHelperPromptTostringResponseBad
	}>(
		'/helper/prompt/tostring',
		{
			schema: {
				description: 'Convert data from "prompt-format" to "string"',
				tags: ['helper'],
				body: PostHelperPromptTostringRequestDto,
				response: {
					200: PostHelperPromptTostringResponseDto,
					500: PostHelperPromptTostringResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /helper/prompt/tostring'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const { promts } = req.body
				const content = PromptConvToString(promts)

				res.header('Content-Type', 'text/plain')
				res.send(content)
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to convert prompt to string'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
