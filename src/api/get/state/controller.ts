import type { FastifyInstance } from 'fastify'
import {
	GetStateResponseDto,
	GetStateResponseBadDto,
	type TGetStateResponse,
	type TGetStateResponseBad,
} from './dto'
import { ServerStats } from '../../../serverStats'
import { QueuePrompt } from '../../../queue'
import { Db } from '../../../db'
import { Log } from '../../../log'
import { GetGpuInfo } from '../../post/prompt/additional/getGpuInfo'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetStateResponse | TGetStateResponseBad
	}>(
		'/state',
		{
			schema: {
				description: 'Get service statistics',
				tags: ['state'],
				response: {
					200: GetStateResponseDto,
					500: GetStateResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /state'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const serverStats = ServerStats()
				const queue = QueuePrompt()
				const db = Db()

				// Time intervals in milliseconds
				const ONE_HOUR = 60 * 60 * 1000
				const THREE_HOURS = 3 * 60 * 60 * 1000
				const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

				// Get statistics for each interval and GPU info in parallel
				const [stats1h, stats3h, stats24h, gpuInfo] = await Promise.all([
					db.getStatistics(ONE_HOUR),
					db.getStatistics(THREE_HOURS),
					db.getStatistics(TWENTY_FOUR_HOURS),
					GetGpuInfo(),
				])

				const response: TGetStateResponse = {
					serverStartTimestamp: serverStats.getServerStartTimestamp(),
					serverUptimeSeconds: serverStats.getServerUptimeSeconds(),
					currentModel: serverStats.getCurrentModel(),
					gpuInfo,
					memoryUsageMb: serverStats.getMemoryUsageMb(),
					memoryHeapMb: serverStats.getMemoryHeapMb(),
					memoryExternalMb: serverStats.getMemoryExternalMb(),
					queueSize: queue.getSize(),
					savePromptEnabled: req.server.appConfig.log.savePrompt,
					stats1h,
					stats3h,
					stats24h,
				}

				res.send(response)
				//Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get service statistics'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
