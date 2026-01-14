import { Type, type Static } from '@sinclair/typebox'

// POST /helper/prompt/fromstring request parameters
export const PostHelperPromptFromstringRequestDto = Type.Object({
	content: Type.String({ description: 'String content to convert to prompt format' }),
})

export const PostHelperPromptFromstringResponseDto = Type.Unknown({
	description: 'Converted prompt array (dynamic structure from vv-ai-prompt-format)',
})

export const PostHelperPromptFromstringResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TPostHelperPromptFromstringRequest = Static<typeof PostHelperPromptFromstringRequestDto>
export type TPostHelperPromptFromstringResponse = Static<typeof PostHelperPromptFromstringResponseDto>
export type TPostHelperPromptFromstringResponseBad = Static<typeof PostHelperPromptFromstringResponseBadDto>
