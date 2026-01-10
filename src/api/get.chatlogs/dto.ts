import { Type } from '@sinclair/typebox'

export const ChatLogsQueryDto = Type.Object({
	afterId: Type.Optional(Type.String()),
	limit: Type.Optional(Type.String()),
})

export type TChatLogsQuery = {
	afterId?: string
	limit?: string
}

export const ChatLogsResponseDto = Type.Object({
	logs: Type.Array(
		Type.Object({
			id: Type.Number(),
			ts: Type.Number(),
			code: Type.Number(),
			durationPromtMsec: Type.Number(),
			durationQueueMsec: Type.Number(),
			request: Type.Optional(Type.String()),
			response: Type.Optional(Type.String()),
		}),
	),
})

export type TChatLogsResponse = {
	logs: Array<{
		id: number
		ts: number
		code: number
		durationPromtMsec: number
		durationQueueMsec: number
		request?: string
		response?: string
	}>
}
