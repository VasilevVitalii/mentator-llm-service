import { Type, type Static } from '@sinclair/typebox'

export const StatResponseDto = Type.Object({
	uptime: Type.Number({ description: 'Service uptime in seconds' }),
	availableModels: Type.Array(Type.String(), { description: 'List of available model files' }),
	currentModel: Type.Union([Type.String(), Type.Null()], {
		description: 'Currently loaded model name or null',
	}),
})

export type TStatResponse = Static<typeof StatResponseDto>
