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
import { join } from 'path'

export async function Go(config: TConfig): Promise<void> {
	let fastify: ReturnType<typeof Fastify> | undefined

	try {
		Db.init(config.dbFile)
		QueuePromt.init()
		Log.init(config.log)
		if (Db().error) {
			Log().error('DB', Db().error || '')
		} else {
			Log().debug('DB', `init db in "${config.dbFile}"`)
		}
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

							// Skip all logs for /promt and /api/checkformat endpoints - they have custom logging
							if (req && (req.url === '/promt' || req.url === '/api/checkformat')) {
								return
							}

							// Skip GET requests - they have custom logging via onResponse hook
							if (req && req.method === 'GET') {
								return
							}

							// Skip "request completed" messages
							if (message.includes('request completed') || message.includes('Request completed')) {
								return
							}

							// For non-GET requests, use standard logging
							let logMessage = message
							if (req) {
								logMessage = `${req.method} ${req.url}`
							}
							if (res) {
								logMessage += ` - ${res.statusCode}`
							}

							if (level >= 50) {
								Log().error('FASTIFY', logMessage, parsed.err ? JSON.stringify(parsed.err, null, 2) : undefined)
							} else if (level >= 30) {
								Log().debug('FASTIFY', logMessage)
							} else {
								Log().trace('FASTIFY', logMessage)
							}
						} catch {
							Log().trace('FASTIFY', msg.trim())
						}
					},
				},
			},
		})
		fastify.decorate('appConfig', config)

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
			root: join(__dirname, 'static'),
			prefix: '/static/',
		})

		// Custom logging for GET requests
		fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
			if (request.method === 'GET' && request.url !== '/promt') {
				const statusCode = reply.statusCode
				const url = request.url
				const pipe = `GET.${statusCode}`

				// Success: 2xx and 304 (Not Modified)
				if ((statusCode >= 200 && statusCode < 300) || statusCode === 304) {
					Log().trace(pipe, url)
				} else {
					Log().error(pipe, url)
				}
			}
			done()
		})

		for (const controller of controllers) {
			await controller(fastify)
		}

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
	if (fastify) {
		try {
			await fastify.close()
		} catch {}
	}
	try {
		Db().close()
	} catch {}
	console.log('FINISH')
}
