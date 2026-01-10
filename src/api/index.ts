import { type FastifyInstance } from 'fastify'
import { controller as pagesController } from './get.pages/controller'
import { controller as versionController } from './get.version/controller'
import { controller as modelsController } from './get.models/controller'
import { controller as promtController } from './post.promt/controller'
import { controller as checkformatController } from './post.check.format/controller'
import { controller as checkoptionsController } from './post.check.options/controller'
import { controller as statdataController } from './get.statdata/controller'
import { controller as exampleFormatController } from './get.example.format/controller'
import { controller as exampleOptionsController } from './get.example.options/controller'
import { controller as exampleOptionsJsonController } from './get.example.optionsjson/controller'
import { controller as promtLoadController } from './post.promt.load/controller'
import { controller as promtStoreController } from './post.promt.store/controller'
import { controller as corelogsController } from './get.corelogs/controller'
import { controller as corelogsDownloadController } from './post.corelogs.download/controller'

export const controllers = [
	pagesController,
	versionController,
	modelsController,
	promtController,
	checkformatController,
	checkoptionsController,
	statdataController,
	exampleFormatController,
	exampleOptionsController,
	exampleOptionsJsonController,
	promtLoadController,
	promtStoreController,
	corelogsController,
	corelogsDownloadController,
] as Array<(fastify: FastifyInstance) => Promise<void>>
