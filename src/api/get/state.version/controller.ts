import type { FastifyInstance } from 'fastify'
import {
	GetStateVersionResponseDto,
	GetStateVersionResponseBadDto,
	type TGetStateVersionResponse,
	type TGetStateVersionResponseBad,
} from './dto'
import { fsReadFile } from '../../../util/fsReadFile'
import { join } from 'path'
import { Log } from '../../../log'

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: TGetStateVersionResponse | TGetStateVersionResponseBad
	}>(
		'/state/version',
		{
			schema: {
				description: 'Get service version from package.json',
				tags: ['state'],
				response: {
					200: GetStateVersionResponseDto,
					500: GetStateVersionResponseBadDto,
				},
			},
		},
		async (req, res) => {
			const pipe = 'API.GET /state/version'
			const log = `[from ${req.ip || req.socket.remoteAddress || 'unknown'}] ${req.url}`

			try {
				const pkgPath = join(process.cwd(), 'package.json')
				const result = await fsReadFile(pkgPath)

				if (!result.ok || !result.result) {
					throw new Error('Failed to read package.json')
				}

				const pkg = JSON.parse(result.result)
				res.send({ version: pkg.version })
				//Log().trace(pipe, log)
			} catch (err: any) {
				const error = err.message || 'Failed to get service version'
				res.code(500).send({ error })
				Log().error(pipe, log, error)
			}
		},
	)
}
