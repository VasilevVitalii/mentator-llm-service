import type { FastifyInstance } from 'fastify'
import { CoreLogsByDateQueryDto, type TCoreLogsByDateQuery } from './dto'
import { Db } from '../../../db'

function formatLogLine(log: {
	id: number
	ts: number
	pipe: string
	kind: string
	message: string
	extra?: string
}): string {
	const date = new Date(log.ts)
	// Format as local server time instead of UTC
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	const ms = String(date.getMilliseconds()).padStart(3, '0')
	const timestampLocal = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
	let line = `[${timestampLocal}] [${log.kind}] [${log.pipe}] ${log.message}`

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
	fastify.get<{
		Querystring: TCoreLogsByDateQuery
		Reply: Array<{ filename: string; content: string }>
	}>(
		'/log/core/bydate',
		{
			schema: {
				description: 'Download core logs for specified date and optional hour',
				tags: ['log'],
				querystring: CoreLogsByDateQueryDto,
			},
		},
		async (req, res) => {
			const db = Db()
			const dateStr = req.query.date
			const hourStr = req.query.hour

			// Parse YYYYMMDD format
			const year = parseInt(dateStr.substring(0, 4), 10)
			const month = parseInt(dateStr.substring(4, 6), 10) - 1
			const day = parseInt(dateStr.substring(6, 8), 10)

			let dateStart: number
			let dateEnd: number

			if (hourStr) {
				// Filter by specific hour in local server timezone
				const hour = parseInt(hourStr, 10)
				dateStart = new Date(year, month, day, hour, 0, 0, 0).getTime()
				dateEnd = new Date(year, month, day, hour + 1, 0, 0, 0).getTime()
			} else {
				// Filter by entire day in local server timezone
				dateStart = new Date(year, month, day, 0, 0, 0, 0).getTime()
				dateEnd = new Date(year, month, day + 1, 0, 0, 0, 0).getTime()
			}

			const logs = await db.getCoreLogsByDate(dateStart, dateEnd)

			const maxSizeBytes = 1024 * 1024 // 1 MB
			const files = splitLogsIntoFiles(logs, maxSizeBytes)

			const hourSuffix = hourStr ? `-${hourStr}` : ''
			const response = files.map(file => ({
				filename: `mentator-llm-service-corelogs-${dateStr}${hourSuffix}-${String(file.fileNumber).padStart(5, '0')}.txt`,
				content: file.content,
			}))

			res.code(200).send(response)
		},
	)
}
