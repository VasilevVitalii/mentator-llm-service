import { Type, type Static } from '@sinclair/typebox'
import { SPromtOptions } from 'vv-ai-promt-store'

export const CheckOptionsRequestDto = Type.Object({
	options: Type.Any(),
})

export const CheckOptionsResponseDto = Type.Object({
	options: Type.Optional(SPromtOptions),
	error: Type.String(),
})

export type TCheckOptionsRequest = Static<typeof CheckOptionsRequestDto>
export type TCheckOptionsResponse = Static<typeof CheckOptionsResponseDto>
