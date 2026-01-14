import { Type, type Static } from '@sinclair/typebox'

// GET /helper/example/options has no request parameters
// Response returns raw JSON (defVal from vv-ai-prompt-format)

export const GetHelperExampleOptionsResponseDto = Type.Unknown({
	description: 'Example LLM options object (dynamic structure from vv-ai-prompt-format)',
})

export const GetHelperExampleOptionsResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetHelperExampleOptionsResponse = Static<typeof GetHelperExampleOptionsResponseDto>
export type TGetHelperExampleOptionsResponseBad = Static<typeof GetHelperExampleOptionsResponseBadDto>
