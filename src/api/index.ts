import { type FastifyInstance } from 'fastify'

import { controller as postPrompt } from './post/prompt/controller'
import { controller as postHelperPromptFromstring } from './post/helper.prompt.fromstring/controller'
import { controller as postHelperPromptTostring } from './post/helper.prompt.tostring/controller'
import { controller as postCheckGbnf } from './post/check.gbnf/controller'
import { controller as postCheckOptions } from './post/check.options/controller'
import { controller as postCheckJsonresponse } from './post/check.jsonresponse/controller'

import { controller as getUi } from './get/_ui/controller'
import { controller as getState } from './get/state/controller'
import { controller as getStateVersion } from './get/state.version/controller'
import { controller as getStateModels } from './get/state.models/controller'
import { controller as getLogCoreByid } from './get/log.core.byid/controller'
import { controller as getLogCoreBydate } from './get/log.core.bydate/controller'
import { controller as getLogChatByid } from './get/log.chat.byid/controller'
import { controller as getLogChatBydate } from './get/log.chat.bydate/controller'
import { controller as getHelperExampleJsonresponse } from './get/helper.example.jsonresponse/controller'
import { controller as getHelperExampleOptions } from './get/helper.example.options/controller'
import { controller as getHelperExampleOptionsJson } from './get/helper.example.optionsjson/controller'

export const controllers = [
	postPrompt,
	postHelperPromptFromstring,
	postHelperPromptTostring,
	postCheckOptions,
	postCheckJsonresponse,
	postCheckGbnf,
	getLogCoreByid,
	getLogCoreBydate,
	getLogChatByid,
	getLogChatBydate,
	getState,
	getStateVersion,
	getStateModels,
	getHelperExampleJsonresponse,
	getHelperExampleOptions,
	getHelperExampleOptionsJson,
	getUi,
] as Array<(fastify: FastifyInstance) => Promise<void>>
