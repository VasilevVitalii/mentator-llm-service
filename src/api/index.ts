import { type FastifyInstance } from 'fastify'
import { controller as pagesController } from './get.pages/controller'
import { controller as versionController } from './get.version/controller'
import { controller as promtController } from './post.promt/controller'
import { controller as checkformatController } from './post.checkformat/controller'

export const controllers = [pagesController, versionController, promtController, checkformatController] as Array<
	(fastify: FastifyInstance) => Promise<void>
>
