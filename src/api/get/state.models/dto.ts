import { Type, type Static } from '@sinclair/typebox'

// GET /state/models has no request parameters

const ModelDto = Type.Object({
	name: Type.String(),
	relativeFileName: Type.String(),
	sizeKb: Type.Number(),
})

export const GetStateModelsResponseDto = Type.Object({
	models: Type.Array(ModelDto),
})

export const GetStateModelsResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetStateModelsResponse = Static<typeof GetStateModelsResponseDto>
export type TGetStateModelsResponseBad = Static<typeof GetStateModelsResponseBadDto>
