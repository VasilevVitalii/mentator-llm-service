import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { fsReadFile } from '../../util/fsReadFile'
import { join } from 'path'

const VersionResponseDto = Type.Object({
	version: Type.String(),
})

export async function controller(fastify: FastifyInstance) {
	fastify.get<{
		Reply: { version: string }
	}>('/api/version', {
		schema: {
			description: 'Get service version from package.json',
			tags: ['info'],
			response: {
				200: VersionResponseDto,
			},
		},
	}, async (req, res) => {
		// Читаем версию из package.json
		const pkgPath = join(__dirname, '..', '..', '..', 'package.json')
		const result = await fsReadFile(pkgPath)

		if (!result.ok || !result.result) {
			res.code(500).send({ version: 'unknown' })
			return
		}

		const pkg = JSON.parse(result.result)
		res.send({ version: pkg.version })
	})
}
