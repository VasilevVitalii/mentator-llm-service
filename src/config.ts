import { vvConfigJsonc, Type, type Static } from 'vv-config-jsonc'
import { join } from 'path'
import { fsWriteFileSync } from './util/fsWriteFile'
import { readFileSync } from 'fs'

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
	defaultOptions: Type.Object({
		temperature: Type.Number({
			description: 'Sampling temperature (higher = more creative, lower = more deterministic)',
			default: 0.0,
			minimum: 0.0,
			maximum: 2.0,
		}),
		topP: Type.Number({
			description: 'Nucleus sampling: cumulative probability threshold',
			default: 0.1,
			minimum: 0.0,
			maximum: 1.0,
		}),
		topK: Type.Integer({
			description: 'Top-K sampling: number of highest probability tokens to keep',
			default: 10,
			minimum: 1,
			maximum: 1000,
		}),
		minP: Type.Number({
			description: 'Minimum probability threshold for token sampling',
			default: 0.0,
			minimum: 0.0,
			maximum: 1.0,
		}),
		maxTokens: Type.Integer({
			description: 'Maximum number of tokens to generate',
			default: 4096,
			minimum: 1,
			maximum: 131072,
		}),
		repeatPenalty: Type.Number({
			description: 'Penalty for repeating tokens (1.0 = no penalty)',
			default: 1.0,
			minimum: -2.0,
			maximum: 2.0,
		}),
		repeatPenaltyNum: Type.Integer({
			description: 'Number of last tokens to apply repeat penalty to',
			default: 0,
			minimum: 0,
			maximum: 2048,
		}),
		presencePenalty: Type.Number({
			description: 'Penalty for tokens that have appeared (0.0 = no penalty)',
			default: 0.0,
			minimum: -2.0,
			maximum: 2.0,
		}),
		frequencyPenalty: Type.Number({
			description: 'Penalty proportional to token frequency (0.0 = no penalty)',
			default: 0.0,
			minimum: -2.0,
			maximum: 2.0,
		}),
		mirostat: Type.Integer({
			description: 'Mirostat sampling mode (0 = disabled, 1 = Mirostat 1.0, 2 = Mirostat 2.0)',
			default: 0,
			minimum: 0,
			maximum: 2,
		}),
		mirostatTau: Type.Number({
			description: 'Mirostat target entropy (used when mirostat > 0)',
			default: 5.0,
			minimum: 0.0,
			maximum: 10.0,
		}),
		mirostatEta: Type.Number({
			description: 'Mirostat learning rate (used when mirostat > 0)',
			default: 0.1,
			minimum: 0,
			maximum: 1.0,
		}),
		penalizeNewline: Type.Boolean({
			description: 'Penalize newline tokens in generation',
			default: false,
		}),
		stopSequences: Type.Array(Type.String(), {
			description: 'Array of strings that will stop generation when encountered',
			default: [],
		}),
		trimWhitespace: Type.Boolean({
			description: 'Trim leading and trailing whitespace from output',
			default: true,
		}),
		seed: Type.Optional(
			Type.Integer({
				description: 'Random seed for reproducible results (optional)',
				minimum: 0,
			}),
		),
	}),
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
