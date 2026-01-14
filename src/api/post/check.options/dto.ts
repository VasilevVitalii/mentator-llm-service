import { Type, type Static } from '@sinclair/typebox'
import { SPromptOptions } from 'vv-ai-prompt-format'

// POST /check/options request parameters
export const PostCheckOptionsRequestDto = Type.Object({
	options: Type.Any({ description: 'LLM generation options to validate' }),
})

export const PostCheckOptionsResponseDto = Type.Object({
	options: Type.Optional(SPromptOptions),
	error: Type.String({ description: 'Empty string if valid, error message otherwise' }),
})

export const PostCheckOptionsResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TPostCheckOptionsRequest = Static<typeof PostCheckOptionsRequestDto>
export type TPostCheckOptionsResponse = Static<typeof PostCheckOptionsResponseDto>
export type TPostCheckOptionsResponseBad = Static<typeof PostCheckOptionsResponseBadDto>
