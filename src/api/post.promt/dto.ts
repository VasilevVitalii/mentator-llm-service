import { Type, type Static } from '@sinclair/typebox'

export const PromtRequestDto = Type.Object({
	model: Type.String({ description: 'Model name (file name without .gguf extension)' }),
	message: Type.Object({
		system: Type.Optional(Type.String({ description: 'System prompt' })),
		user: Type.String({ description: 'User prompt' }),
	}),
	durationMsec: Type.Number({ description: 'Maximum duration in milliseconds' }),
	options: Type.Optional(
		Type.Object({
			temperature: Type.Optional(
				Type.Number({
					description: 'Sampling temperature (higher = more creative, lower = more deterministic)',
					minimum: 0.0,
					maximum: 2.0,
				}),
			),
			topP: Type.Optional(
				Type.Number({
					description: 'Nucleus sampling: cumulative probability threshold',
					minimum: 0.0,
					maximum: 1.0,
				}),
			),
			topK: Type.Optional(
				Type.Integer({
					description: 'Top-K sampling: number of highest probability tokens to keep',
					minimum: 1,
					maximum: 1000,
				}),
			),
			minP: Type.Optional(
				Type.Number({
					description: 'Minimum probability threshold for token sampling',
					minimum: 0.0,
					maximum: 1.0,
				}),
			),
			maxTokens: Type.Optional(
				Type.Integer({
					description: 'Maximum number of tokens to generate',
					minimum: 1,
					maximum: 131072,
				}),
			),
			repeatPenalty: Type.Optional(
				Type.Number({
					description: 'Penalty for repeating tokens (1.0 = no penalty)',
					minimum: -2.0,
					maximum: 2.0,
				}),
			),
			repeatPenaltyNum: Type.Optional(
				Type.Integer({
					description: 'Number of last tokens to apply repeat penalty to',
					minimum: 0,
					maximum: 2048,
				}),
			),
			presencePenalty: Type.Optional(
				Type.Number({
					description: 'Penalty for tokens that have appeared (0.0 = no penalty)',
					minimum: -2.0,
					maximum: 2.0,
				}),
			),
			frequencyPenalty: Type.Optional(
				Type.Number({
					description: 'Penalty proportional to token frequency (0.0 = no penalty)',
					minimum: -2.0,
					maximum: 2.0,
				}),
			),
			mirostat: Type.Optional(
				Type.Integer({
					description: 'Mirostat sampling mode (0 = disabled, 1 = Mirostat 1.0, 2 = Mirostat 2.0)',
					minimum: 0,
					maximum: 2,
				}),
			),
			mirostatTau: Type.Optional(
				Type.Number({
					description: 'Mirostat target entropy (used when mirostat > 0)',
					minimum: 0.0,
					maximum: 10.0,
				}),
			),
			mirostatEta: Type.Optional(
				Type.Number({
					description: 'Mirostat learning rate (used when mirostat > 0)',
					minimum: 0,
					maximum: 1.0,
				}),
			),
			penalizeNewline: Type.Optional(Type.Boolean({ description: 'Penalize newline tokens in generation' })),
			stopSequences: Type.Optional(Type.Array(Type.String(), { description: 'Array of strings that will stop generation when encountered' })),
			trimWhitespace: Type.Optional(Type.Boolean({ description: 'Trim leading and trailing whitespace from output' })),
			seed: Type.Optional(
				Type.Integer({
					description: 'Random seed for reproducible results',
					minimum: 0,
				}),
			),
		}),
	),
	format: Type.Optional(
		Type.Object({
			useGrammar: Type.Boolean({
				description: 'Use JSON Schema for grammar-guided generation (if false, only validates response)',
			}),
			jsonSchema: Type.Any({
				description:
					'JSON Schema object for response validation and/or grammar-guided generation. See https://json-schema.org/understanding-json-schema',
			}),
		}),
	),
})

export const PromtResponseDto = Type.Object({
	duration: Type.Object({
		promtMsec: Type.Number({ description: 'Actual prompt processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	result: Type.Object({
		loadModelStatus: Type.Union([Type.Literal('load'), Type.Literal('exists')], {
			description: 'Model loading status',
		}),
		data: Type.Any(),
	}),
})

export type TPromtRequest = Static<typeof PromtRequestDto>
export type TPromtResponse = Static<typeof PromtResponseDto>