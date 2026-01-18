import { vvConfigJsonc, Type, type Static } from 'vv-config-jsonc'
import { join } from 'path'
import { fsWriteFileSync } from './util/fsWriteFile'
import { readFileSync } from 'fs'
import { SPromptOptionsJson } from 'vv-ai-prompt-format'

export const SConfigDocker = Type.Object({
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
			description: 'Save full info from API /promt by success request/response in prompt/promptExtra tables',
			default: false,
		}),
	}),
})

export const SConfig = Type.Intersect([
	Type.Object({
		port: Type.Number({ description: 'Port where server worked', default: 19777, minimum: 1, maximum: 65535 }),
		modelDir: Type.String({
			description: 'Full path to directory with model gguf files',
			default: 'path/to/models',
		}),
		dbFile: Type.String({
			description: 'File name (with full path) to sqlite file with working data',
			default: 'path/to/mentator-llm-service.db',
		}),
	}),
	SConfigDocker,
])

export type TConfigDocker = Static<typeof SConfigDocker>
export type TConfig = Static<typeof SConfig>

export function ConfigGerenateFile(fullPath: string, fileName: string = `mentator-llm-service.config.TEMPLATE.jsonc`): { error?: string; success?: string } {
	const fullFileName = join(fullPath, fileName)
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

export function ConfigReadFile(fullFileName: string): { error?: string; conf?: TConfig } {
	try {
		const text = readFileSync(fullFileName, 'utf-8')
		const configReadRes = ConfigRead(text)
		if (configReadRes.error) {
			return { error: `error(s) in config "${fullFileName}": ${configReadRes.error}` }
		}
		fsWriteFileSync(fullFileName, configReadRes.trueText!)
		return { conf: configReadRes.conf }
	} catch (err) {
		return { error: `error read config "${fullFileName}": ${err}` }
	}
}

export function ConfigGerenate(): { error?: string; conf?: TConfig } {
	try {
		const conf = new vvConfigJsonc(SConfig).getDefault()
		return { conf: conf.object }
	} catch (err) {
		return { error: `on create default config: ${err}` }
	}
}

export function ConfigRead(text: string): { error?: string; conf?: TConfig; trueText?: string } {
	try {
		const conf = new vvConfigJsonc(SConfig).getConfig(text)
		if (conf.errors.length > 0) {
			return { error: `${conf.errors.join('; ')}` }
		}
		return { conf: conf.config, trueText: conf.text }
	} catch (err) {
		return { error: `${err}` }
	}
}

export function ConfigDockerGerenateFile(
	fullPath: string,
	fileName: string = `mentator-llm-service.config.TEMPLATE-DOCKER.jsonc`,
): { error?: string; success?: string } {
	const fullFileName = join(fullPath, fileName)
	try {
		const conf = new vvConfigJsonc(SConfigDocker).getDefault()
		const resWrite = fsWriteFileSync(fullFileName, conf.text)
		if (!resWrite.ok) {
			return { error: `on create default config: ${resWrite.error}` }
		}
		return { success: `config create "${fullFileName}"` }
	} catch (err) {
		return { error: `on create default config: ${err}` }
	}
}

export function ConfigDockerReadFile(fullFileName: string): { error?: string; conf?: TConfigDocker } {
	try {
		const text = readFileSync(fullFileName, 'utf-8')
		const configReadRes = ConfigDockerRead(text)
		if (configReadRes.error) {
			return { error: `error(s) in config "${fullFileName}": ${configReadRes.error}` }
		}
		fsWriteFileSync(fullFileName, configReadRes.trueText!)
		return { conf: configReadRes.conf }
	} catch (err) {
		return { error: `error read config "${fullFileName}": ${err}` }
	}
}

export function ConfigDockerRead(text: string): { error?: string; conf?: TConfigDocker; trueText?: string } {
	try {
		const conf = new vvConfigJsonc(SConfigDocker).getConfig(text)
		if (conf.errors.length > 0) {
			return { error: `${conf.errors.join('; ')}` }
		}
		return { conf: conf.config, trueText: conf.text }
	} catch (err) {
		return { error: `${err}` }
	}
}
