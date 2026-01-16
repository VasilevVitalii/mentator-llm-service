import { type TConfig } from './config'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fastifyStatic from '@fastify/static'
import { controllers } from './api/index'
import { ModelManager } from './modelManager'
import { QueuePrompt } from './queue'
import { Db } from './db'
import { Log } from './log'
import { ServerStats } from './serverStats'
import { join } from 'path'

// const ALLOW_LOG_API_PROMPT = [
// 	{method: 'POST', url: }
// ]

export async function Go(config: TConfig): Promise<void> {
	let fastify: ReturnType<typeof Fastify> | undefined

	try {
		Db.init(config.dbFile)
		QueuePrompt.init()
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
			logger: false,
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

			// Return a safe error response that matches PromptResponseBadDto
			const duration = {
				promptMsec: 0,
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

		for (const controller of controllers) {
			await controller(fastify)
		}

		setInterval(() => {
			Log().debug('APP', `memory (rss) ${ServerStats().getMemoryUsageMb()} mb; memory (heap) ${ServerStats().getMemoryHeapMb()} mb; memory (external) ${ServerStats().getMemoryExternalMb()} mb; queue size ${QueuePrompt().getSize()}`)
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
		Log().debug('APP',	`LISTEN http://127.0.0.1:${config.port}/`)
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
