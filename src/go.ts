import { type TConfig } from './config'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fastifyStatic from '@fastify/static'
import { controllers } from './api/index'
import { ModelManager } from './modelManager'
import { QueuePromt } from './queue'
import { Db } from './db'
import { Log } from './log'
import { ServerStats } from './serverStats'
import { join } from 'path'

// const ALLOW_LOG_API_PROMT = [
// 	{method: 'POST', url: }
// ]

export async function Go(config: TConfig): Promise<void> {
	let fastify: ReturnType<typeof Fastify> | undefined

	try {
		Db.init(config.dbFile)
		QueuePromt.init()
		Log.init(config.log)
		ServerStats.init()
		if (Db().error) {
			Log().error('DB', Db().error || '')
		} else {
			Log().debug('DB', `init db in "${config.dbFile}"`)
		}
		Log().debug('APP','START')
		ModelManager.init(config.modelDir)
		ModelManager().scanModelDirStart(60000)

		fastify = Fastify({
			logger: {
				level: 'info',
				stream: {
					write: (msg: string) => {
						try {
							const parsed = JSON.parse(msg)
							const level = parsed.level
							const message = parsed.msg || ''
							const req = parsed.req
							const res = parsed.res

							// if (req && (req.url === '/prompt' || req.url === '/api/checkformat' || req.url === '/api/checkoptions')) {
							// 	return
							// }
							// if (req && req.method === 'GET') {
							// 	return
							// }
							// if (message.includes('request completed') || message.includes('Request completed')) {
							// 	return
							// }

							if ((req || res) && level < 50) {
								return
							}

							let logMessage = message
							if (req) {
								logMessage = `${req.method} ${req.url}`
							}
							if (res) {
								logMessage += ` - ${res.statusCode}`
							}

							if (level >= 50) {
								Log().error('API', logMessage, parsed.err ? JSON.stringify(parsed.err, null, 2) : undefined)
							} else if (level >= 30) {
								Log().debug('API', logMessage)
							} else {
								Log().trace('API', logMessage)
							}
						} catch {
							Log().trace('API', msg.trim())
						}
					},
				},
			},
		})
		fastify.decorate('appConfig', config)

		// Error handler for serialization and validation errors
		fastify.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
			const errorDetails = {
				message: error.message,
				code: error.code,
				statusCode: error.statusCode,
				validation: error.validation,
			}
			Log().error('API', `Error handler for ${request.method} ${request.url}`, JSON.stringify(errorDetails, null, 2))

			// Return a safe error response that matches PromtResponseBadDto
			const duration = {
				promtMsec: 0,
				queueMsec: 0,
			}

			const statusCode = error.statusCode || 500
			reply.code(statusCode).send({
				duration,
				error: error.message || 'Internal server error',
			})
		})

		await fastify.register(fastifySwagger, {
			openapi: {
				info: {
					title: 'Mentator LLM Service',
					description: 'Specialized service for extracting metadata from DDL scripts',
					version: '1.0.0',
				},
				servers: [
					{
						url: `http://localhost:${config.port}`,
					},
				],
			},
		})

		await fastify.register(fastifySwaggerUi, {
			routePrefix: '/doc',
		})

		await fastify.register(fastifyStatic, {
			root: join(process.cwd(), 'src', 'static'),
			prefix: '/static/',
		})

		// Custom logging for GET requests
		fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
			if (request.method === 'GET' && request.url !== '/prompt') {
				const statusCode = reply.statusCode
				const url = request.url
				const ip = request.ip || request.socket.remoteAddress || 'unknown'
				const pipe = `API.GET.${statusCode}`
				const message = `[from ${ip}] ${url}`

				// Success: 2xx and 304 (Not Modified)
				if ((statusCode >= 200 && statusCode < 300) || statusCode === 304) {
					Log().trace(pipe, message)
				} else {
					Log().error(pipe, message)
				}
			}
			done()
		})

		for (const controller of controllers) {
			await controller(fastify)
		}

		setInterval(() => {
			Log().debug('APP', `memory (rss) ${ServerStats().getMemoryUsageMb()} mb; memory (heap) ${ServerStats().getMemoryHeapMb()} mb; memory (external) ${ServerStats().getMemoryExternalMb()} mb; queue size ${QueuePromt().getSize()}`)
		}, 60000)

		process.on('SIGTERM', async () => {
			await finish(fastify)
			process.exit(0)
		})
		process.on('SIGINT', async () => {
			await finish(fastify)
			process.exit(0)
		})

		await fastify.listen({ port: config.port, host: '0.0.0.0' })
	} catch (error) {
		console.error(`${error}`)
	}
}

async function finish(fastify: ReturnType<typeof Fastify> | undefined): Promise<void> {
	try {
		Log().debug('APP','FINISH')
	} catch {
		console.log('FINISH')
	}
	if (fastify) {
		try {
			await fastify.close()
		} catch {}
	}
	try {
		Db().close()
	} catch {}
}
