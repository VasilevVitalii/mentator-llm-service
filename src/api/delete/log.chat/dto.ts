import { Type, type Static } from '@sinclair/typebox'

// DELETE /log/chat response
export const DeleteLogChatResponseDto = Type.Object({
	deleted: Type.Number({ description: 'Number of deleted records' }),
})

export const DeleteLogChatResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TDeleteLogChatResponse = Static<typeof DeleteLogChatResponseDto>
export type TDeleteLogChatResponseBad = Static<typeof DeleteLogChatResponseBadDto>
