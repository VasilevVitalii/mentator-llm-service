import type { FastifyInstance } from 'fastify'
import { PromtOptionsParse } from 'vv-ai-promt-store'
import { CheckOptionsRequestDto, CheckOptionsResponseDto, type TCheckOptionsRequest, type TCheckOptionsResponse } from './dto'
import { Log } from '../../log'

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
		Body: TCheckOptionsRequest
		Reply: TCheckOptionsResponse
	}>(
		'/api/checkoptions',
		{
			schema: {
				description: 'Validate and complete LLM generation options',
				tags: ['validation'],
				body: CheckOptionsRequestDto,
				response: {
					200: CheckOptionsResponseDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'POST.CHECKOPTIONS.200'

			try {
				const { options: inputOptions } = req.body

				// Check if input is object
				if (typeof inputOptions !== 'object' || inputOptions === null || Array.isArray(inputOptions)) {
					const response = {
						options: DEFAULT_OPTIONS,
						error: 'Options must be a JSON object',
					}
					res.send(response)
					Log().trace(pipe, req.url)
					return
				}

				// Parse and validate with package function (never throws)
				// useAllOptions=true adds defaults for missing parameters
				const validatedOptions = PromtOptionsParse('json', inputOptions, true)

				// Success: valid and complete options
				const response = { options: validatedOptions, error: '' }
				res.send(response)
				Log().trace(pipe, req.url)
			} catch (err: any) {
				const response = {
					options: DEFAULT_OPTIONS,
					error: err.message || 'Failed to validate options',
				}
				res.send(response)
				Log().trace(pipe, req.url)
			}
		},
	)
}
