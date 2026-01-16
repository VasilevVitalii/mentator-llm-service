import type { FastifyInstance } from 'fastify'
import {
	PostHelperPromptFromstringRequestDto,
	PostHelperPromptFromstringResponseDto,
	PostHelperPromptFromstringResponseBadDto,
	type TPostHelperPromptFromstringRequest,
	type TPostHelperPromptFromstringResponse,
	type TPostHelperPromptFromstringResponseBad,
} from './dto'
import { PromptConvFromString } from 'vv-ai-prompt-format'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostHelperPromptFromstringRequest
		Reply: TPostHelperPromptFromstringResponse | TPostHelperPromptFromstringResponseBad
	}>(
		'/helper/prompt/fromstring',
		{
			schema: {
				description: 'Convert data from "string" to "prompt-format"',
				tags: ['helper'],
				body: PostHelperPromptFromstringRequestDto,
				response: {
					200: PostHelperPromptFromstringResponseDto,
					500: PostHelperPromptFromstringResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /helper/prompt/fromstring'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const { content } = req.body
				const prompts = PromptConvFromString(content, 'json')

				res.header('Content-Type', 'application/json')
				res.send(JSON.stringify(prompts))
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to parse prompt'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
