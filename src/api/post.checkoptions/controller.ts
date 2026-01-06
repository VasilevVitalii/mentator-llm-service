import type { FastifyInstance } from 'fastify'
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

				// Merge with defaults (missing parameters will be added)
				const mergedOptions = { ...DEFAULT_OPTIONS, ...inputOptions }

				// Validate types and ranges
				const validationErrors: string[] = []

				if (typeof mergedOptions.temperature !== 'number' || mergedOptions.temperature < 0.0 || mergedOptions.temperature > 2.0) {
					validationErrors.push('temperature must be a number between 0.0 and 2.0')
				}
				if (typeof mergedOptions.topP !== 'number' || mergedOptions.topP < 0.0 || mergedOptions.topP > 1.0) {
					validationErrors.push('topP must be a number between 0.0 and 1.0')
				}
				if (typeof mergedOptions.topK !== 'number' || !Number.isInteger(mergedOptions.topK) || mergedOptions.topK < 1 || mergedOptions.topK > 1000) {
					validationErrors.push('topK must be an integer between 1 and 1000')
				}
				if (typeof mergedOptions.minP !== 'number' || mergedOptions.minP < 0.0 || mergedOptions.minP > 1.0) {
					validationErrors.push('minP must be a number between 0.0 and 1.0')
				}
				if (typeof mergedOptions.maxTokens !== 'number' || !Number.isInteger(mergedOptions.maxTokens) || mergedOptions.maxTokens < 1 || mergedOptions.maxTokens > 131072) {
					validationErrors.push('maxTokens must be an integer between 1 and 131072')
				}
				if (typeof mergedOptions.repeatPenalty !== 'number' || mergedOptions.repeatPenalty < -2.0 || mergedOptions.repeatPenalty > 2.0) {
					validationErrors.push('repeatPenalty must be a number between -2.0 and 2.0')
				}
				if (typeof mergedOptions.repeatPenaltyNum !== 'number' || !Number.isInteger(mergedOptions.repeatPenaltyNum) || mergedOptions.repeatPenaltyNum < 0 || mergedOptions.repeatPenaltyNum > 2048) {
					validationErrors.push('repeatPenaltyNum must be an integer between 0 and 2048')
				}
				if (typeof mergedOptions.presencePenalty !== 'number' || mergedOptions.presencePenalty < -2.0 || mergedOptions.presencePenalty > 2.0) {
					validationErrors.push('presencePenalty must be a number between -2.0 and 2.0')
				}
				if (typeof mergedOptions.frequencyPenalty !== 'number' || mergedOptions.frequencyPenalty < -2.0 || mergedOptions.frequencyPenalty > 2.0) {
					validationErrors.push('frequencyPenalty must be a number between -2.0 and 2.0')
				}
				if (typeof mergedOptions.mirostat !== 'number' || !Number.isInteger(mergedOptions.mirostat) || mergedOptions.mirostat < 0 || mergedOptions.mirostat > 2) {
					validationErrors.push('mirostat must be an integer between 0 and 2')
				}
				if (typeof mergedOptions.mirostatTau !== 'number' || mergedOptions.mirostatTau < 0.0 || mergedOptions.mirostatTau > 10.0) {
					validationErrors.push('mirostatTau must be a number between 0.0 and 10.0')
				}
				if (typeof mergedOptions.mirostatEta !== 'number' || mergedOptions.mirostatEta < 0.0 || mergedOptions.mirostatEta > 1.0) {
					validationErrors.push('mirostatEta must be a number between 0.0 and 1.0')
				}
				if (typeof mergedOptions.penalizeNewline !== 'boolean') {
					validationErrors.push('penalizeNewline must be a boolean')
				}
				if (!Array.isArray(mergedOptions.stopSequences)) {
					validationErrors.push('stopSequences must be an array')
				} else if (!mergedOptions.stopSequences.every((s: any) => typeof s === 'string')) {
					validationErrors.push('stopSequences must be an array of strings')
				}
				if (typeof mergedOptions.trimWhitespace !== 'boolean') {
					validationErrors.push('trimWhitespace must be a boolean')
				}
				if (mergedOptions.seed !== undefined) {
					if (typeof mergedOptions.seed !== 'number' || !Number.isInteger(mergedOptions.seed) || mergedOptions.seed < 0) {
						validationErrors.push('seed must be a positive integer or undefined')
					}
				}

				if (validationErrors.length > 0) {
					const response = {
						options: mergedOptions,
						error: validationErrors.join('; '),
					}
					res.send(response)
					Log().trace(pipe, req.url)
					return
				}

				// Success: valid and complete options
				const response = { options: mergedOptions }
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
