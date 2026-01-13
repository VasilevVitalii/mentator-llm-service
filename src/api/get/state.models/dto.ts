import { Type } from '@sinclair/typebox'

export const ModelDto = Type.Object({
	name: Type.String(),
	relativeFileName: Type.String(),
	sizeKb: Type.Number(),
})

export const GetModelsResponseDto = Type.Object({
	models: Type.Array(ModelDto),
})

export type TGetModelsResponse = {
	models: Array<{
		name: string
		relativeFileName: string
		sizeKb: number
	}>
}
