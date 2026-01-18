import { existsSync } from 'fs'

export function fsExistsFileSync(fullFileName: string): boolean {
	try {
		if (existsSync(fullFileName)) {
			return true
		} else {
			return false
		}
	} catch {
		return false
	}
}
