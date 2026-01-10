import { Type, type Static } from '@sinclair/typebox'

export const StatDataResponseDto = Type.Object({
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
	memoryUsageMb: Type.Number(),
	memoryHeapMb: Type.Number(),
	memoryExternalMb: Type.Number(),
	queueSize: Type.Number(),
	stats1h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromtDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromtDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
	stats3h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromtDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromtDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
	stats24h: Type.Object({
		total: Type.Number(),
		success: Type.Number(),
		failed: Type.Number(),
		avgPromtDuration: Type.Number(),
		avgQueueDuration: Type.Number(),
		p95PromtDuration: Type.Number(),
		p95QueueDuration: Type.Number(),
	}),
})

export type TStatDataResponse = Static<typeof StatDataResponseDto>
