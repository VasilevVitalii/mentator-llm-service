import { Type, type Static } from '@sinclair/typebox'

// GET /log/core/bydate request parameters (query string)
export const GetLogCoreBydateRequestDto = Type.Object({
	date: Type.String({ description: 'Date in YYYYMMDD format (server local timezone)' }),
	hour: Type.Optional(Type.String({ description: 'Hour in HH format (00-23, server local timezone), optional' })),
})

// Response is array of files with log content
const LogFileDto = Type.Object({
	filename: Type.String(),
	content: Type.String(),
})

export const GetLogCoreBydateResponseDto = Type.Array(LogFileDto)

export const GetLogCoreBydateResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetLogCoreBydateRequest = Static<typeof GetLogCoreBydateRequestDto>
export type TGetLogCoreBydateResponse = Static<typeof GetLogCoreBydateResponseDto>
export type TGetLogCoreBydateResponseBad = Static<typeof GetLogCoreBydateResponseBadDto>
