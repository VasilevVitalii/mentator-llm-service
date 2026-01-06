import { Type, type Static } from '@sinclair/typebox'

export const CheckFormatRequestDto = Type.Object({
	schema: Type.Any(),
})

export const CheckFormatResponseDto = Type.Object({
	valid: Type.Boolean(),
	error: Type.Optional(Type.String()),
})

export type TCheckFormatRequest = Static<typeof CheckFormatRequestDto>
export type TCheckFormatResponse = Static<typeof CheckFormatResponseDto>
