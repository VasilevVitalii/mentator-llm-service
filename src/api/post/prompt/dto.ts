import { Type, type Static } from '@sinclair/typebox'
import { SPromptOptions } from 'vv-ai-prompt-format'

// POST /prompt request parameters
export const PostPromptRequestDto = Type.Object({
	model: Type.String({ description: 'Model name (file name without .gguf extension)' }),
	message: Type.Object({
		system: Type.Optional(Type.String({ description: 'System prompt' })),
		user: Type.String({ description: 'User prompt' }),
	}),
	durationMsec: Type.Number({ description: 'Maximum duration in milliseconds' }),
	options: Type.Optional(SPromptOptions),
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

export const PostPromptResponseDto = Type.Object({
	duration: Type.Object({
		promptMsec: Type.Number({ description: 'Actual prompt processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	result: Type.Object({
		loadModelStatus: Type.Union([Type.Literal('load'), Type.Literal('exists')], {
			description: 'Model loading status',
		}),
		data: Type.Any(),
	}),
})

export const PostPromptResponseBadDto = Type.Object({
	duration: Type.Object({
		promptMsec: Type.Number({ description: 'Actual prompt processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	error: Type.String({ description: 'Error message' }),
})

export type TPostPromptRequest = Static<typeof PostPromptRequestDto>
export type TPostPromptResponse = Static<typeof PostPromptResponseDto>
export type TPostPromptResponseBad = Static<typeof PostPromptResponseBadDto>