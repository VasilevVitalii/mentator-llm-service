import type { FastifyInstance } from 'fastify'
import { ChatLogsDownloadRequestDto, type TChatLogsDownloadRequest } from './dto'
import { Db } from '../../db'

function formatDuration(msec: number): string {
	if (msec < 1000) {
		return `${msec}ms`
	}
	const sec = Math.floor(msec / 1000)
	const ms = msec % 1000
	if (sec < 60) {
		return `${sec}.${String(ms).padStart(3, '0')}s`
	}
	const min = Math.floor(sec / 60)
	const s = sec % 60
	const msPadded = String(ms).padStart(3, '0')
	return `${min}m ${s}.${msPadded}s`
}

function formatChatLogLine(log: {
	id: number
	ts: number
	code: number
	durationPromtMsec: number
	durationQueueMsec: number
	request?: string
	response?: string
}): string {
	const date = new Date(log.ts)
	const timestampISO = date.toISOString()
	const durationPromt = formatDuration(log.durationPromtMsec)
	const durationQueue = formatDuration(log.durationQueueMsec)

	let line = `[${timestampISO}] [${log.code}] duration promt ${durationPromt}; duration queue ${durationQueue}`

	if (log.request) {
		line += '\n' + log.request.split('\n').map(l => `        ${l}`).join('\n')
	}

	if (log.response) {
		line += '\n' + log.response.split('\n').map(l => `        ${l}`).join('\n')
	}

	return line
}

function splitLogsIntoFiles(logs: Array<any>, maxSizeBytes: number): Array<{ content: string; fileNumber: number }> {
	const files: Array<{ content: string; fileNumber: number }> = []
	let currentContent = ''
	let fileNumber = 1

	for (const log of logs) {
		const logLine = formatChatLogLine(log) + '\n'
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
		Body: TChatLogsDownloadRequest
		Reply: Array<{ filename: string; content: string }>
	}>(
		'/api/chatlogs/download',
		{
			schema: {
				description: 'Download chat logs for specified date and hour',
				tags: ['logs'],
				body: ChatLogsDownloadRequestDto,
			},
		},
		async (req, res) => {
			const db = Db()
			const dateHourStr = req.body.dateHour

			// Parse YYYYMMDD HH format
			const year = parseInt(dateHourStr.substring(0, 4), 10)
			const month = parseInt(dateHourStr.substring(4, 6), 10) - 1
			const day = parseInt(dateHourStr.substring(6, 8), 10)
			const hour = parseInt(dateHourStr.substring(9, 11), 10)

			const dateStart = Date.UTC(year, month, day, hour, 0, 0, 0)
			const dateEnd = Date.UTC(year, month, day, hour + 1, 0, 0, 0)

			const logs = await db.getChatLogsByDateHour(dateStart, dateEnd)

			const maxSizeBytes = 1024 * 1024 // 1 MB
			const files = splitLogsIntoFiles(logs, maxSizeBytes)

			const response = files.map(file => ({
				filename: `mentator-llm-service-chatlogs-${dateHourStr.replace(' ', '-')}-${String(file.fileNumber).padStart(5, '0')}.txt`,
				content: file.content,
			}))

			res.code(200).send(response)
		},
	)
}
