import { Type, type Static } from '@sinclair/typebox'

// POST /helper/prompt/tostring request parameters
export const PostHelperPromptTostringRequestDto = Type.Object({
	prompts: Type.Array(Type.Any(), { description: 'Prompt array to convert to string' }),
})

export const PostHelperPromptTostringResponseDto = Type.String({
	description: 'Converted string content',
})

export const PostHelperPromptTostringResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TPostHelperPromptTostringRequest = Static<typeof PostHelperPromptTostringRequestDto>
export type TPostHelperPromptTostringResponse = Static<typeof PostHelperPromptTostringResponseDto>
export type TPostHelperPromptTostringResponseBad = Static<typeof PostHelperPromptTostringResponseBadDto>
