#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs'
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

// Configuration (must be set via environment variables or .env file)
const MODEL_SOURCE_PATH = process.env.DOCKER_DEFAULT_MODEL
const MODEL_DEST_DIR = join(PROJECT_ROOT, 'default-models')
const IMAGE_NAME = process.env.DOCKER_IMAGE_NAME || 'mentator-llm-service'

// Validate required configuration
if (!MODEL_SOURCE_PATH) {
	console.error('✗ Error: DOCKER_DEFAULT_MODEL is not set')
	console.error('  Please create a .env file with:')
	console.error('    DOCKER_DEFAULT_MODEL=/path/to/your/model.gguf')
	console.error('  Or set it as an environment variable.')
	process.exit(1)
}

// Parse command line arguments
const args = process.argv.slice(2)
const shouldPublish = args.includes('--publish') || process.env.DOCKER_PUBLISH === 'true'

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

console.log('=== Mentator LLM Service Docker Build Script ===\n')

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

// Step 2: Prepare default models
console.log('\nStep 2: Preparing default models...')
if (!existsSync(MODEL_DEST_DIR)) {
	mkdirSync(MODEL_DEST_DIR, { recursive: true })
	console.log(`✓ Created directory: ${MODEL_DEST_DIR}`)
}

if (!existsSync(MODEL_SOURCE_PATH)) {
	console.error(`✗ Model not found: ${MODEL_SOURCE_PATH}`)
	console.error('  Please ensure the test model is available at this path.')
	process.exit(1)
}

const modelFileName = MODEL_SOURCE_PATH.split('/').pop()
const modelDestPath = join(MODEL_DEST_DIR, modelFileName)

console.log(`Copying model: ${modelFileName}`)
copyFileSync(MODEL_SOURCE_PATH, modelDestPath)
console.log(`✓ Model copied to: ${modelDestPath}`)

// Step 3: Build Docker image
console.log('\nStep 3: Building Docker image...')
const version = getVersion()
const tags = [`${IMAGE_NAME}:latest`, `${IMAGE_NAME}:${version}`]

const tagArgs = tags.map((tag) => `-t ${tag}`).join(' ')
run(`docker build ${tagArgs} .`)

console.log('\n✓ Docker image built successfully')
console.log(`  Tags: ${tags.join(', ')}`)

// Step 4: Display image size
console.log('\nStep 4: Image information...')
run(`docker images ${IMAGE_NAME} --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}"`)

// Step 5: Publish (optional)
if (shouldPublish) {
	console.log('\nStep 5: Publishing to Docker Hub...')
	console.log('⚠ Publishing is not implemented yet.')
	console.log('  To publish manually, run:')
	tags.forEach((tag) => {
		console.log(`    docker push ${tag}`)
	})
} else {
	console.log('\nℹ Skip publishing (use --publish flag or DOCKER_PUBLISH=true to publish)')
}

// Final summary
console.log('\n=== Build Complete ===')
console.log(`\nTo run the container:`)
console.log(`  docker run --rm -v $(pwd)/data:/opt/mentator-llm-service/data -p 19777:19777 ${IMAGE_NAME}:latest`)
console.log(`\nWith NVIDIA GPU:`)
console.log(`  docker run --rm --gpus=all -v $(pwd)/data:/opt/mentator-llm-service/data -p 19777:19777 ${IMAGE_NAME}:latest`)
console.log(`\nWith AMD GPU:`)
console.log(`  docker run --rm --device /dev/kfd --device /dev/dri -v $(pwd)/data:/opt/mentator-llm-service/data -p 19777:19777 ${IMAGE_NAME}:latest`)
console.log()
