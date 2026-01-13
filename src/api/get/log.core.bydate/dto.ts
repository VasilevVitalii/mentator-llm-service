import { Type, type Static } from '@sinclair/typebox'

export const CoreLogsByDateQueryDto = Type.Object({
	date: Type.String({ description: 'Date in YYYYMMDD format (server local timezone)' }),
	hour: Type.Optional(Type.String({ description: 'Hour in HH format (00-23, server local timezone), optional' })),
})

export type TCoreLogsByDateQuery = Static<typeof CoreLogsByDateQueryDto>
