import { Type, type Static } from '@sinclair/typebox'

// GET /helper/example/jsonresponse has no request parameters
// Response returns raw JSON string

export const GetHelperExampleJsonresponseResponseDto = Type.Object({
	schema: Type.String({ description: 'Example JSON schema as string' }),
})

export const GetHelperExampleJsonresponseResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetHelperExampleJsonresponseResponse = Static<typeof GetHelperExampleJsonresponseResponseDto>
export type TGetHelperExampleJsonresponseResponseBad = Static<typeof GetHelperExampleJsonresponseResponseBadDto>
