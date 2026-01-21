#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

// Load .env file if exists
function loadEnv() {
	const envPath = join(PROJECT_ROOT, '.env')
	if (existsSync(envPath)) {
		const envContent = readFileSync(envPath, 'utf-8')
		envContent.split('\n').forEach((line) => {
			line = line.trim()
			if (line && !line.startsWith('#')) {
				const [key, ...valueParts] = line.split('=')
				if (key && valueParts.length > 0) {
					const value = valueParts.join('=').trim()
					// Only set if not already set in environment
					if (!process.env[key]) {
						process.env[key] = value
					}
				}
			}
		})
		console.log('✓ Loaded configuration from .env file')
	}
}

loadEnv()

// Configuration (can be set via environment variables or .env file)
const IMAGE_NAME = process.env.DOCKER_IMAGE_NAME || 'mentator-llm-service'
const DOCKER_USERNAME = process.env.DOCKER_USERNAME
const DOCKER_REGISTRY = process.env.DOCKER_REGISTRY || '' // Empty for Docker Hub

function run(command, options = {}) {
	console.log(`\n$ ${command}`)
	try {
		const output = execSync(command, {
			cwd: PROJECT_ROOT,
			stdio: 'inherit',
			...options,
		})
		return output
	} catch (error) {
		console.error(`Command failed: ${command}`)
		process.exit(1)
	}
}

function getVersion() {
	const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'))
	return packageJson.version
}

console.log('=== Mentator LLM Service Docker Publish Script ===\n')

// Step 1: Check Docker
console.log('Step 1: Checking Docker...')
try {
	run('docker --version', { stdio: 'pipe' })
	console.log('✓ Docker is available')
} catch {
	console.error('✗ Docker is not available. Please install Docker first.')
	process.exit(1)
}

// Check if Docker daemon is running
try {
	run('docker info', { stdio: 'pipe' })
	console.log('✓ Docker daemon is running')
} catch {
	console.error('✗ Docker daemon is not running. Please start Docker.')
	process.exit(1)
}

// Step 2: Validate configuration
console.log('\nStep 2: Validating configuration...')
if (!DOCKER_USERNAME) {
	console.error('✗ Error: DOCKER_USERNAME is not set')
	console.error('  Please create a .env file with:')
	console.error('    DOCKER_USERNAME=your-docker-hub-username')
	console.error('  Or set it as an environment variable.')
	process.exit(1)
}
console.log(`✓ Docker username: ${DOCKER_USERNAME}`)

// Step 3: Check if image exists locally
console.log('\nStep 3: Checking local image...')
const version = getVersion()
const localImageName = IMAGE_NAME
const remoteImageName = DOCKER_REGISTRY ? `${DOCKER_REGISTRY}/${DOCKER_USERNAME}/${IMAGE_NAME}` : `${DOCKER_USERNAME}/${IMAGE_NAME}`

try {
	run(`docker image inspect ${localImageName}:latest`, { stdio: 'pipe' })
	console.log(`✓ Local image found: ${localImageName}:latest`)
} catch {
	console.error(`✗ Local image not found: ${localImageName}:latest`)
	console.error('  Please build the image first with: node .auto/docker-build.js')
	process.exit(1)
}

// Step 4: Check Docker login status
console.log('\nStep 4: Checking Docker Hub login status...')
try {
	const result = execSync('docker info', { encoding: 'utf-8', stdio: 'pipe' })
	if (result.includes('Username:')) {
		console.log('✓ Already logged in to Docker Hub')
	} else {
		throw new Error('Not logged in')
	}
} catch {
	console.log('⚠ Not logged in to Docker Hub')
	console.log('  Please login with: docker login')
	console.log('  Then run this script again.')
	process.exit(1)
}

// Step 5: Tag images for publishing
console.log('\nStep 5: Tagging images for publishing...')
const tags = [
	{ local: `${localImageName}:latest`, remote: `${remoteImageName}:latest` },
	{ local: `${localImageName}:${version}`, remote: `${remoteImageName}:${version}` },
]

tags.forEach(({ local, remote }) => {
	console.log(`Tagging: ${local} → ${remote}`)
	run(`docker tag ${local} ${remote}`)
})
console.log('✓ Images tagged successfully')

// Step 6: Push images
console.log('\nStep 6: Pushing images to Docker Hub...')
tags.forEach(({ remote }) => {
	console.log(`Pushing: ${remote}`)
	run(`docker push ${remote}`)
})

// Final summary
console.log('\n=== Publish Complete ===')
console.log(`\nPublished images:`)
tags.forEach(({ remote }) => {
	console.log(`  ${remote}`)
})
console.log(`\nOthers can now pull and run your image:`)
console.log(`  docker pull ${remoteImageName}:latest`)
console.log(`  docker run --rm -v $(pwd)/data:/opt/mentator-llm-service/data -p 19777:19777 ${remoteImageName}:latest`)
console.log()
