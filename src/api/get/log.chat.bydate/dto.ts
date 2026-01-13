import { Type, type Static } from '@sinclair/typebox'

export const ChatLogsByDateQueryDto = Type.Object({
	date: Type.String({ description: 'Date in YYYYMMDD format (server local timezone)' }),
	hour: Type.Optional(Type.String({ description: 'Hour in HH format (00-23, server local timezone), optional' })),
})

export type TChatLogsByDateQuery = Static<typeof ChatLogsByDateQueryDto>
