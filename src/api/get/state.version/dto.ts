import { Type, type Static } from '@sinclair/typebox'

// GET /state/version has no request parameters

export const GetStateVersionResponseDto = Type.Object({
	version: Type.String({ description: 'Service version from package.json' }),
})

export const GetStateVersionResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetStateVersionResponse = Static<typeof GetStateVersionResponseDto>
export type TGetStateVersionResponseBad = Static<typeof GetStateVersionResponseBadDto>
