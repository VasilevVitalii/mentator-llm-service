import { Type, type Static } from '@sinclair/typebox'

export const CheckJsonResponseRequestDto = Type.Object({
	schema: Type.Any(),
})

export const CheckJsonResponseResponseDto = Type.Object({
	error: Type.String(),
})

export type TCheckJsonResponseRequest = Static<typeof CheckJsonResponseRequestDto>
export type TCheckJsonResponseResponse = Static<typeof CheckJsonResponseResponseDto>
