import { Type, type Static } from '@sinclair/typebox'

// POST /check/jsonresponse request parameters
export const PostCheckJsonresponseRequestDto = Type.Object({
	schema: Type.Any({ description: 'JSON Schema to validate (without GBNF conversion)' }),
})

export const PostCheckJsonresponseResponseDto = Type.Object({
	error: Type.String({ description: 'Empty string if valid, error message otherwise' }),
})

export const PostCheckJsonresponseResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TPostCheckJsonresponseRequest = Static<typeof PostCheckJsonresponseRequestDto>
export type TPostCheckJsonresponseResponse = Static<typeof PostCheckJsonresponseResponseDto>
export type TPostCheckJsonresponseResponseBad = Static<typeof PostCheckJsonresponseResponseBadDto>
