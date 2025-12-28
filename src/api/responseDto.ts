import { Type, type Static } from '@sinclair/typebox'

export const PromtResponseBadDto = Type.Object({
	durationMsec: Type.Number({ description: 'Actual processing duration in milliseconds' }),
	error: Type.Optional(Type.String()),
})

export type TPromtResponseBad = Static<typeof PromtResponseBadDto>