import { Type, type Static } from '@sinclair/typebox'

// GET /log/chat/bydate request parameters (query string)
export const GetLogChatBydateRequestDto = Type.Object({
	date: Type.String({ description: 'Date in YYYYMMDD format (server local timezone)' }),
	hour: Type.Optional(Type.String({ description: 'Hour in HH format (00-23, server local timezone), optional' })),
})

// Response is array of files with log content
const LogFileDto = Type.Object({
	filename: Type.String(),
	content: Type.String(),
})

export const GetLogChatBydateResponseDto = Type.Array(LogFileDto)

export const GetLogChatBydateResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetLogChatBydateRequest = Static<typeof GetLogChatBydateRequestDto>
export type TGetLogChatBydateResponse = Static<typeof GetLogChatBydateResponseDto>
export type TGetLogChatBydateResponseBad = Static<typeof GetLogChatBydateResponseBadDto>
