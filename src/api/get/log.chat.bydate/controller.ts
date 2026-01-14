import type { FastifyInstance } from 'fastify'
import {
	GetLogChatBydateRequestDto,
	GetLogChatBydateResponseDto,
	GetLogChatBydateResponseBadDto,
	type TGetLogChatBydateRequest,
	type TGetLogChatBydateResponse,
	type TGetLogChatBydateResponseBad,
} from './dto'
import { Db } from '../../../db'
import { Log } from '../../../log'

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
	// Format as local time instead of UTC
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	const ms = String(date.getMilliseconds()).padStart(3, '0')
	const timestampLocal = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
	const durationPromt = formatDuration(log.durationPromtMsec)
	const durationQueue = formatDuration(log.durationQueueMsec)

	let line = `[${timestampLocal}] [${log.code}] duration promt ${durationPromt}; duration queue ${durationQueue}`

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
	fastify.get<{
		Querystring: TGetLogChatBydateRequest
		Reply: TGetLogChatBydateResponse | TGetLogChatBydateResponseBad
	}>(
		'/log/chat/bydate',
		{
			schema: {
				description: 'Download chat logs for specified date and optional hour',
				tags: ['log'],
				querystring: GetLogChatBydateRequestDto,
				response: {
					200: GetLogChatBydateResponseDto,
					500: GetLogChatBydateResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /log/chat/bydate'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
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

				const logs = await db.getChatLogsByDateHour(dateStart, dateEnd)

				const maxSizeBytes = 1024 * 1024 // 1 MB
				const files = splitLogsIntoFiles(logs, maxSizeBytes)

				const hourSuffix = hourStr ? `-${hourStr}` : ''
				const response = files.map(file => ({
					filename: `mentator-llm-service-chatlogs-${dateStr}${hourSuffix}-${String(file.fileNumber).padStart(5, '0')}.txt`,
					content: file.content,
				}))

				res.send(response)
				Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to download chat logs'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
