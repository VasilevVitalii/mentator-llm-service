import type { FastifyInstance } from 'fastify'
import { fsReadFile } from '../../util/fsReadFile'
import { join } from 'path'

export async function controller(fastify: FastifyInstance) {
	const staticDir = join(__dirname, '..', '..', 'static', 'pages')

	// Helper to serve HTML
	const serveHtml = async (filename: string) => {
		const filePath = join(staticDir, filename)
		const result = await fsReadFile(filePath)

		if (!result.ok) {
			throw new Error(`Failed to read ${filename}: ${result.error || 'File not found'}`)
		}

		if (!result.result) {
			throw new Error(`Failed to read ${filename}: File is empty`)
		}

		return result.result
	}

	// Welcome page
	fastify.get('/', {
		schema: {
			description: 'Welcome page with navigation',
			tags: ['pages'],
		}
	}, async (req, res) => {
		const html = await serveHtml('index.html')
		res.type('text/html').send(html)
	})

	// Statistics dashboard
	fastify.get('/stat', {
		schema: {
			description: 'Service statistics dashboard',
			tags: ['pages'],
		}
	}, async (req, res) => {
		const html = await serveHtml('stat.html')
		res.type('text/html').send(html)
	})

	// Chat interface
	fastify.get('/chat', {
		schema: {
			description: 'Chat interface for sending prompts',
			tags: ['pages'],
		}
	}, async (req, res) => {
		const html = await serveHtml('chat.html')
		res.type('text/html').send(html)
	})

	// Core logs viewer
	fastify.get('/log/core', {
		schema: {
			description: 'Core logs viewer (log and logExtra tables)',
			tags: ['pages'],
		}
	}, async (req, res) => {
		const html = await serveHtml('log-core.html')
		res.type('text/html').send(html)
	})

	// Chat logs viewer
	fastify.get('/log/chat', {
		schema: {
			description: 'Chat logs viewer (promt and promtExtra tables)',
			tags: ['pages'],
		}
	}, async (req, res) => {
		const html = await serveHtml('log-chat.html')
		res.type('text/html').send(html)
	})
}
