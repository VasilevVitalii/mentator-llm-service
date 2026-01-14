import { Type, type Static } from '@sinclair/typebox'

// GET /log/chat/byid request parameters (query string)
export const GetLogChatByidRequestDto = Type.Object({
	afterId: Type.Optional(Type.String({ description: 'Get logs after this ID' })),
	limit: Type.Optional(Type.String({ description: 'Max number of logs to return (max 200)' })),
})

const ChatLogDto = Type.Object({
	id: Type.Number(),
	ts: Type.Number(),
	code: Type.Number(),
	durationPromtMsec: Type.Number(),
	durationQueueMsec: Type.Number(),
	request: Type.Optional(Type.String()),
	response: Type.Optional(Type.String()),
})

export const GetLogChatByidResponseDto = Type.Object({
	logs: Type.Array(ChatLogDto),
})

export const GetLogChatByidResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetLogChatByidRequest = Static<typeof GetLogChatByidRequestDto>
export type TGetLogChatByidResponse = Static<typeof GetLogChatByidResponseDto>
export type TGetLogChatByidResponseBad = Static<typeof GetLogChatByidResponseBadDto>
