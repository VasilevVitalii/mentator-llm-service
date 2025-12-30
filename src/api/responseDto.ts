import { Type, type Static } from '@sinclair/typebox'

export const PromtResponseBadDto = Type.Object({
	duration: Type.Object({
		promtMsec: Type.Number({ description: 'Actual prompt processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	error: Type.Optional(Type.String()),
})

export type TPromtResponseBad = Static<typeof PromtResponseBadDto>