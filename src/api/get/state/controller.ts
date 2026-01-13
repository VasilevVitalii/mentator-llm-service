import type { FastifyInstance } from 'fastify'
import { StatDataResponseDto, type TStatDataResponse } from './dto'
import { ServerStats } from '../../../serverStats'
import { QueuePromt } from '../../../queue'
import { Db } from '../../../db'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TStatDataResponse
	}>(
		'/state',
		{
			schema: {
				description: 'Get service statistics',
				tags: ['state'],
				response: {
					200: StatDataResponseDto,
				},
			},
		},
		async (_req, res) => {
			const serverStats = ServerStats()
			const queue = QueuePromt()
			const db = Db()

			// Time intervals in milliseconds
			const ONE_HOUR = 60 * 60 * 1000
			const THREE_HOURS = 3 * 60 * 60 * 1000
			const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

			// Get statistics for each interval
			const [stats1h, stats3h, stats24h] = await Promise.all([
				db.getStatistics(ONE_HOUR),
				db.getStatistics(THREE_HOURS),
				db.getStatistics(TWENTY_FOUR_HOURS),
			])

			const response: TStatDataResponse = {
				serverStartTimestamp: serverStats.getServerStartTimestamp(),
				serverUptimeSeconds: serverStats.getServerUptimeSeconds(),
				currentModel: serverStats.getCurrentModel(),
				memoryUsageMb: serverStats.getMemoryUsageMb(),
				memoryHeapMb: serverStats.getMemoryHeapMb(),
				memoryExternalMb: serverStats.getMemoryExternalMb(),
				queueSize: queue.getSize(),
				stats1h,
				stats3h,
				stats24h,
			}

			res.code(200).send(response)
		},
	)
}
