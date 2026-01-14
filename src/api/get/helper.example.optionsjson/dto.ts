import { Type, type Static } from '@sinclair/typebox'

// GET /helper/example/optionsjson has no request parameters
// Response returns raw JSON (defValJson from vv-ai-prompt-format)

export const GetHelperExampleOptionsjsonResponseDto = Type.Unknown({
	description: 'Example LLM options object for JSON-like response (dynamic structure from vv-ai-prompt-format)',
})

export const GetHelperExampleOptionsjsonResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetHelperExampleOptionsjsonResponse = Static<typeof GetHelperExampleOptionsjsonResponseDto>
export type TGetHelperExampleOptionsjsonResponseBad = Static<typeof GetHelperExampleOptionsjsonResponseBadDto>
