import { Type, type Static } from '@sinclair/typebox'

export const CoreLogDto = Type.Object({
	id: Type.Number(),
	ts: Type.Number(),
	pipe: Type.String(),
	kind: Type.String(),
	message: Type.String(),
	extra: Type.Optional(Type.String()),
})

export const CoreLogsResponseDto = Type.Object({
	logs: Type.Array(CoreLogDto),
})

export type TCoreLogsResponse = Static<typeof CoreLogsResponseDto>
