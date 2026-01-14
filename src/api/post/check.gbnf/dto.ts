import { Type, type Static } from '@sinclair/typebox'

// POST /check/gbnf request parameters
export const PostCheckGbnfRequestDto = Type.Object({
	schema: Type.Any({ description: 'JSON Schema to validate and convert to GBNF' }),
})

export const PostCheckGbnfResponseDto = Type.Object({
	error: Type.String({ description: 'Empty string if valid, error message otherwise' }),
})

export const PostCheckGbnfResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TPostCheckGbnfRequest = Static<typeof PostCheckGbnfRequestDto>
export type TPostCheckGbnfResponse = Static<typeof PostCheckGbnfResponseDto>
export type TPostCheckGbnfResponseBad = Static<typeof PostCheckGbnfResponseBadDto>
