import { Type, type Static } from '@sinclair/typebox'
import { SPromptOptions } from 'vv-ai-prompt-format'

export const CheckOptionsRequestDto = Type.Object({
	options: Type.Any(),
})

export const CheckOptionsResponseDto = Type.Object({
	options: Type.Optional(SPromptOptions),
	error: Type.String(),
})

export type TCheckOptionsRequest = Static<typeof CheckOptionsRequestDto>
export type TCheckOptionsResponse = Static<typeof CheckOptionsResponseDto>
