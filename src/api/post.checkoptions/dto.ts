import { Type, Static } from '@sinclair/typebox'

export const CheckOptionsRequestDto = Type.Object({
	options: Type.Any(),
})

export const CheckOptionsResponseDto = Type.Object({
	options: Type.Object({
		temperature: Type.Number(),
		topP: Type.Number(),
		topK: Type.Integer(),
		minP: Type.Number(),
		maxTokens: Type.Integer(),
		repeatPenalty: Type.Number(),
		repeatPenaltyNum: Type.Integer(),
		presencePenalty: Type.Number(),
		frequencyPenalty: Type.Number(),
		mirostat: Type.Integer(),
		mirostatTau: Type.Number(),
		mirostatEta: Type.Number(),
		penalizeNewline: Type.Boolean(),
		stopSequences: Type.Array(Type.String()),
		trimWhitespace: Type.Boolean(),
		seed: Type.Optional(Type.Integer()),
	}),
	error: Type.Optional(Type.String()),
})

export type TCheckOptionsRequest = Static<typeof CheckOptionsRequestDto>
export type TCheckOptionsResponse = Static<typeof CheckOptionsResponseDto>
