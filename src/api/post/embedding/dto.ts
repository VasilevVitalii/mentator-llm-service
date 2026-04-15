import { Type, type Static } from '@sinclair/typebox'

export const PostEmbeddingRequestDto = Type.Object({
	model: Type.String({ description: 'Model name (file name without .gguf extension)' }),
	gpulayer: Type.Optional(Type.Number({ description: 'Number of model layers to offload to GPU (0 = CPU only, >0 = layers on GPU)', minimum: 0 })),
	message: Type.String({ description: 'Text to embed' }),
})

export const PostEmbeddingResponseDto = Type.Object({
	duration: Type.Object({
		promptMsec: Type.Number({ description: 'Actual embedding processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	result: Type.Object({
		loadModelStatus: Type.Union([Type.Literal('load'), Type.Literal('exists')], {
			description: 'Model loading status',
		}),
		data: Type.Array(Type.Number(), { description: 'Embedding vector' }),
	}),
})

export const PostEmbeddingResponseBadDto = Type.Object({
	duration: Type.Object({
		promptMsec: Type.Number({ description: 'Actual embedding processing duration in milliseconds' }),
		queueMsec: Type.Number({ description: 'Time spent waiting in queue in milliseconds' }),
	}),
	error: Type.String({ description: 'Error message' }),
})

export type TPostEmbeddingRequest = Static<typeof PostEmbeddingRequestDto>
export type TPostEmbeddingResponse = Static<typeof PostEmbeddingResponseDto>
export type TPostEmbeddingResponseBad = Static<typeof PostEmbeddingResponseBadDto>
