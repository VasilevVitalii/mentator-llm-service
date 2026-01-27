import { Type, type Static } from '@sinclair/typebox'

// GET /state has no request parameters

export const GetStateResponseDto = Type.Object({
	serverStartTimestamp: Type.Number(),
	serverUptimeSeconds: Type.Number(),
	currentModel: Type.Union([
		Type.Object({
			name: Type.String(),
			sizeMb: Type.Number(),
			loadTimestamp: Type.Number(),
		}),
		Type.Null(),
	]),
	gpuInfo: Type.Union([
		Type.Object({
			type: Type.Union([Type.Literal('cuda'), Type.Literal('vulkan'), Type.Literal('metal'), Type.Literal('cpu')]),
			device: Type.Union([Type.String(), Type.Null()]),
			totalVramMb: Type.Union([Type.Number(), Type.Null()]),
			usedVramMb: Type.Union([Type.Number(), Type.Null()]),
		}),
		Type.Null(),
	]),
	memoryUsageMb: Type.Number(),
	memoryHeapMb: Type.Number(),
	memoryExternalMb: Type.Number(),
	queueSize: Type.Number(),
	savePromptEnabled: Type.Boolean(),
	stats1h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromptDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromptDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
	stats3h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromptDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromptDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
	stats24h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromptDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromptDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
})

export const GetStateResponseBadDto = Type.Object({
	error: Type.String({ description: 'Error message' }),
})

export type TGetStateResponse = Static<typeof GetStateResponseDto>
export type TGetStateResponseBad = Static<typeof GetStateResponseBadDto>
