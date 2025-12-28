import { type FastifyInstance } from 'fastify'
import { controller as statController } from './get.stat/controller'
import { controller as chatController } from './get.chat/controller'
import { controller as promtController } from './post.promt/controller'

export const controllers = [statController, chatController, promtController] as Array<
	(fastify: FastifyInstance) => Promise<void>
>
