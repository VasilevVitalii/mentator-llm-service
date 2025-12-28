import { promises as fs, readdirSync, statSync } from 'fs'
import * as path from 'path'
import type { TResult } from '../tresult'

export type TFsReadDirResult = {
	relativeFileName: string
	sizeKb: number
}

export async function fsReadDir(dir: string): Promise<TResult<TFsReadDirResult[]>> {
	try {
		const result = await fsReadDirInternal(dir)
		return { ok: true, result }
	} catch (err) {
		return { ok: false, error: `on read dir ${dir}: "${err}"` }
	}
}

export function fsReadDirSync(dir: string): TResult<TFsReadDirResult[]> {
	try {
		const result = fsReadDirInternalSync(dir)
		return { ok: true, result }
	} catch (err) {
		return { ok: false, error: `on read dir ${dir}: "${err}"` }
	}
}

async function fsReadDirInternal(dir: string, baseDir: string = dir): Promise<TFsReadDirResult[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true })
	const files: TFsReadDirResult[] = []

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		const relativePath = path.relative(baseDir, fullPath)

		if (entry.isDirectory()) {
			const subFiles = await fsReadDirInternal(fullPath, baseDir)
			files.push(...subFiles)
		} else if (entry.isFile()) {
			const stats = await fs.stat(fullPath)
			const sizeBytes = stats.size
			const sizeKb = sizeBytes === 0 ? 0 : Math.max(1, Math.ceil(sizeBytes / 1024))
			files.push({
				relativeFileName: relativePath,
				sizeKb,
			})
		}
	}

	return files
}

function fsReadDirInternalSync(dir: string, baseDir: string = dir): TFsReadDirResult[] {
	const entries = readdirSync(dir, { withFileTypes: true })
	const files: TFsReadDirResult[] = []

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		const relativePath = path.relative(baseDir, fullPath)

		if (entry.isDirectory()) {
			const subFiles = fsReadDirInternalSync(fullPath, baseDir)
			files.push(...subFiles)
		} else if (entry.isFile()) {
			const stats = statSync(fullPath)
			const sizeBytes = stats.size
			const sizeKb = sizeBytes === 0 ? 0 : Math.max(1, Math.ceil(sizeBytes / 1024))
			files.push({
				relativeFileName: relativePath,
				sizeKb,
			})
		}
	}

	return files
}
