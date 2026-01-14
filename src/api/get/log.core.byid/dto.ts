import { Type, type Static } from '@sinclair/typebox'

// GET /log/core/byid request parameters (query string)
export const GetLogCoreByidRequestDto = Type.Object({
	afterId: Type.Optional(Type.String({ description: 'Get logs after this ID' })),
	limit: Type.Optional(Type.String({ description: 'Max number of logs to return (max 200)' })),
})

const CoreLogDto = Type.Object({
	id: Type.Number(),
	ts: Type.Number(),
	pipe: Type.String(),
	kind: Type.String(),
	message: Type.String(),
	extra: Type.Optional(Type.String()),
})

export const GetLogCoreByidResponseDto = Type.Object({
	logs: Type.Array(CoreLogDto),
})

export const GetLogCoreByidResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetLogCoreByidRequest = Static<typeof GetLogCoreByidRequestDto>
export type TGetLogCoreByidResponse = Static<typeof GetLogCoreByidResponseDto>
export type TGetLogCoreByidResponseBad = Static<typeof GetLogCoreByidResponseBadDto>
