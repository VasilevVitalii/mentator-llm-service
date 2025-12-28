import 'fastify'
import type { TConfig } from './config'

declare module 'fastify' {
	interface FastifyInstance {
		appConfig: TConfig
	}
}
