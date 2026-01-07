import { type FastifyInstance } from 'fastify'
import { controller as pagesController } from './get.pages/controller'
import { controller as versionController } from './get.version/controller'
import { controller as modelsController } from './get.models/controller'
import { controller as promtController } from './post.promt/controller'
import { controller as checkformatController } from './post.check.format/controller'
import { controller as checkoptionsController } from './post.check.options/controller'
import { controller as statdataController } from './get.statdata/controller'

export const controllers = [pagesController, versionController, modelsController, promtController, checkformatController, checkoptionsController, statdataController] as Array<
	(fastify: FastifyInstance) => Promise<void>
>
