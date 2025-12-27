import { join, parse, resolve } from 'path'
import { type TConfig } from './config'
import { fsReadDir } from './util/fsReadDir'
import { fsReadFile } from './util/fsReadFile'
import { fsWriteFile } from './util/fsWriteFile'

export async function Go(config: TConfig): Promise<void> {
	try {
        console.log('GOGO!!')
	} catch (error) {
		console.error(`${error}`)
	} finally {
		process.exit()
	}
}
