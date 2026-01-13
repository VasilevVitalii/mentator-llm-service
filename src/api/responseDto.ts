import { Type, type Static } from '@sinclair/typebox'

export const PromptResponseBadDto = Type.Object({
	duration: Type.Object({
		promtMsec: Type.Number({ description: 'Actual prompt processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	error: Type.String({ description: 'Error message' }),
})

export type TPromptResponseBad = Static<typeof PromptResponseBadDto>