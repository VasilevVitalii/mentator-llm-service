import { type TConfig } from './config'
import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { controllers } from './api/index'
import { ModelManager } from './modelManager'

export async function Go(config: TConfig): Promise<void> {
	try {
		const fastify = Fastify({
			logger: true,
		})

		ModelManager.init({
			modelDir: config.modelDir,
			onErrorCore(text) {
				console.error(text)
			},
			onLogCore(text) {
				console.log(text)
			},
		})
		ModelManager().scanModelDirStart(60000)

		// Register Swagger
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

		// Register all controllers
		for (const controller of controllers) {
			await controller(fastify)
		}

		// Start server
		await fastify.listen({ port: config.port, host: '0.0.0.0' })
		console.log(`Server started on http://localhost:${config.port}`)
		console.log(`Swagger documentation available at http://localhost:${config.port}/doc`)
	} catch (error) {
		console.error(`${error}`)
		process.exit(1)
	}
}
