import { Type, type Static } from '@sinclair/typebox'

export const ChatResponseDto = Type.Object({
	message: Type.String(),
})

export type TChatResponse = Static<typeof ChatResponseDto>
