import type { FastifyInstance } from 'fastify'
import { ChatResponseDto } from './dto'

export async function controller(fastify: FastifyInstance) {
	fastify.get(
		'/chat',
		{
			schema: {
				description: 'Simple chat interface with the service',
				tags: ['chat'],
				response: {
					200: ChatResponseDto,
				},
			},
		},
		async (req, res) => {
			res.type('text/html').send(`
<!DOCTYPE html>
<html>
<head>
    <title>Mentator LLM Service - Chat</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>Chat with Mentator LLM Service</h1>
    <p>TODO: Implement chat interface</p>
</body>
</html>
`)
		},
	)
}
