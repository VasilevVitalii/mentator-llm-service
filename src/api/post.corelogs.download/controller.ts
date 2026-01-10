import type { FastifyInstance } from 'fastify'
import { CoreLogsDownloadRequestDto, type TCoreLogsDownloadRequest } from './dto'
import { Db } from '../../db'

function formatLogLine(log: {
	id: number
	ts: number
	pipe: string
	kind: string
	message: string
	extra?: string
}): string {
	const date = new Date(log.ts)
	const timestampISO = date.toISOString()
	let line = `[${timestampISO}] [${log.kind}] [${log.pipe}] ${log.message}`

	if (log.extra) {
		line += '\n' + log.extra.split('\n').map(l => `        ${l}`).join('\n')
	}

	return line
}

function splitLogsIntoFiles(logs: Array<any>, maxSizeBytes: number): Array<{ content: string; fileNumber: number }> {
	const files: Array<{ content: string; fileNumber: number }> = []
	let currentContent = ''
	let fileNumber = 1

	for (const log of logs) {
		const logLine = formatLogLine(log) + '\n'
		const logLineBytes = Buffer.byteLength(logLine)

		if (currentContent.length > 0 && Buffer.byteLength(currentContent) + logLineBytes > maxSizeBytes) {
			files.push({ content: currentContent, fileNumber })
			currentContent = logLine
			fileNumber++
		} else {
			currentContent += logLine
		}
	}

	if (currentContent.length > 0) {
		files.push({ content: currentContent, fileNumber })
	}

	return files
}

export async function controller(fastify: FastifyInstance) {
	fastify.post<{
		Body: TCoreLogsDownloadRequest
		Reply: Array<{ filename: string; content: string }>
	}>(
		'/api/corelogs/download',
		{
			schema: {
				description: 'Download core logs for specified date',
				tags: ['logs'],
				body: CoreLogsDownloadRequestDto,
			},
		},
		async (req, res) => {
			const db = Db()
			const dateStr = req.body.date

			// Parse YYYYMMDD format
			const year = parseInt(dateStr.substring(0, 4), 10)
			const month = parseInt(dateStr.substring(4, 6), 10) - 1
			const day = parseInt(dateStr.substring(6, 8), 10)

			const dateStart = Date.UTC(year, month, day, 0, 0, 0, 0)
			const dateEnd = Date.UTC(year, month, day + 1, 0, 0, 0, 0)

			const logs = await db.getCoreLogsByDate(dateStart, dateEnd)

			const maxSizeBytes = 1024 * 1024 // 1 MB
			const files = splitLogsIntoFiles(logs, maxSizeBytes)

			const response = files.map(file => ({
				filename: `mentator-llm-service-corelogs-${dateStr}-${String(file.fileNumber).padStart(5, '0')}.txt`,
				content: file.content,
			}))

			res.code(200).send(response)
		},
	)
}
