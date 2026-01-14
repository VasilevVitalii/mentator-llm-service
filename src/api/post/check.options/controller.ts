import type { FastifyInstance } from 'fastify'
import { PromptOptionsParse } from 'vv-ai-prompt-format'
import {
	PostCheckOptionsRequestDto,
	PostCheckOptionsResponseDto,
	PostCheckOptionsResponseBadDto,
	type TPostCheckOptionsRequest,
	type TPostCheckOptionsResponse,
	type TPostCheckOptionsResponseBad,
} from './dto'
import { Log } from '../../../log'

const DEFAULT_OPTIONS = {
	temperature: 0.0,
	topP: 0.1,
	topK: 10,
	minP: 0.0,
	maxTokens: 4096,
	repeatPenalty: 1.0,
	repeatPenaltyNum: 0,
	presencePenalty: 0.0,
	frequencyPenalty: 0.0,
	mirostat: 0,
	mirostatTau: 5.0,
	mirostatEta: 0.1,
	penalizeNewline: false,
	stopSequences: [],
	trimWhitespace: true,
	seed: undefined,
	tokenBias: undefined,
	evaluationPriority: undefined,
	contextShiftSize: undefined,
	disableContextShift: undefined,
}

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TPostCheckOptionsRequest
		Reply: TPostCheckOptionsResponse | TPostCheckOptionsResponseBad
	}>(
		'/check/options',
		{
			schema: {
				description: 'Validate and complete LLM generation options',
				tags: ['validation'],
				body: PostCheckOptionsRequestDto,
				response: {
					200: PostCheckOptionsResponseDto,
					500: PostCheckOptionsResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.POST /check/options'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const { options: inputOptions } = req.body

				// Check if input is object
				if (typeof inputOptions !== 'object' || inputOptions === null || Array.isArray(inputOptions)) {
					const response = {
						options: DEFAULT_OPTIONS,
						error: 'Options must be a JSON object',
					}
					res.send(response)
					Log().trace(pipe, log)
					return
				}

				// Parse and validate with package function (never throws)
				// useAllOptions=false does not add defaults for missing parameters
				const validatedOptions = PromptOptionsParse('json', inputOptions, false)

				// Success: valid and complete options
				const response = { options: validatedOptions, error: '' }
				res.send(response)
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to validate options'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
