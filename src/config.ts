import { vvConfigJsonc, Type, type Static } from 'vv-config-jsonc'
import { join } from 'path'
import { fsWriteFileSync } from './util/fsWriteFile'
import { readFileSync } from 'fs'
import { SPromptOptionsJson } from 'vv-ai-prompt-format'

export const SConfig = Type.Object({
	port: Type.Number({ description: 'Port where server worked', default: 8080, minimum: 1, maximum: 65535 }),
	modelDir: Type.String({
		description: 'Full path to directory with model gguf files',
		default: 'path/to/models',
	}),
	dbFile: Type.String({
		description: 'File name (with full path) to sqlite file with working data',
		default: 'path/to/mentator-llm-service.db',
	}),
	defaultOptions: SPromptOptionsJson as any,
	log: Type.Object({
		level: Type.Union([Type.Literal('error'), Type.Literal('debug'), Type.Literal('trace')], {
			description: 'Logging level: error (only errors), debug (errors + debug), trace (all messages)',
			default: 'debug',
		}),
		liveDay: Type.Integer({
			description: 'Number of days to keep logs in database (older logs will be deleted automatically)',
			default: 30,
			minimum: 1,
			maximum: 365,
		}),
		savePrompt: Type.Boolean({
			description: 'Save full request/response text for /prompt endpoint in promtExtra table',
			default: false,
		}),
	}),
})
export type TConfig = Static<typeof SConfig>

export function ConfigGerenate(fullPath: string): { error?: string; success?: string } {
	const fullFileName = join(fullPath, `mentator-llm-service.config.TEMPLATE.jsonc`)
	try {
		const conf = new vvConfigJsonc(SConfig).getDefault()
		const resWrite = fsWriteFileSync(fullFileName, conf.text)
		if (!resWrite.ok) {
			return { error: `on create default config: ${resWrite.error}` }
		}
		return { success: `config create "${fullFileName}"` }
	} catch (err) {
		return { error: `on create default config: ${err}` }
	}
}

export function ConfigRead(fullFileName: string): { error?: string; conf?: TConfig } {
	try {
		const text = readFileSync(fullFileName, 'utf-8')
		const conf = new vvConfigJsonc(SConfig).getConfig(text)
		if (conf.errors.length > 0) {
			return { error: `error(s) in config "${fullFileName}": ${conf.errors.join('; ')}` }
		}
		fsWriteFileSync(fullFileName, conf.text)
		return { conf: conf.config }
	} catch (err) {
		return { error: `error read config "${fullFileName}": ${err}` }
	}
}
