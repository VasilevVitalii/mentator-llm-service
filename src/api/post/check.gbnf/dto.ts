import { Type, type Static } from '@sinclair/typebox'

export const CheckGbnfRequestDto = Type.Object({
	schema: Type.Any(),
})

export const CheckGbnfResponseDto = Type.Object({
	error: Type.String(),
})

export type TCheckGbnfRequest = Static<typeof CheckGbnfRequestDto>
export type TCheckGbnfResponse = Static<typeof CheckGbnfResponseDto>
