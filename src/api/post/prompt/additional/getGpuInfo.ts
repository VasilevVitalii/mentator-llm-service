import { GetLamaIfExists } from './getLama'
import { Log } from '../../../../log'

export type TGpuInfo = {
	type: 'cuda' | 'vulkan' | 'metal' | 'cpu'
	device: string | null
	totalVramMb: number | null
	usedVramMb: number | null
}

export async function GetGpuInfo(): Promise<TGpuInfo | null> {
	try {
		// Only get GPU info if Llama is already initialized (i.e. a model is loaded)
		// Don't try to initialize Llama just for GPU info - it's expensive
		const llama = GetLamaIfExists()

		if (!llama) {
			Log().debug('APP', 'GPU info: Llama not initialized yet (no model loaded)')
			return null
		}

		Log().debug('APP', 'GPU info: getting info from initialized Llama instance')

		// Get GPU type
		const gpuType = llama.gpu
		const type: TGpuInfo['type'] = gpuType === false ? 'cpu' : gpuType
		Log().debug('APP', `GPU info: detected type = ${type}`)

		// Get device name (first device if multiple)
		let device: string | null = null
		try {
			const deviceNames = await llama.getGpuDeviceNames()
			device = deviceNames.length > 0 ? deviceNames[0] ?? null : null
			Log().debug('APP', `GPU info: device = ${device || 'null'}`)
		} catch (err) {
			Log().debug('APP', 'GPU info: device names not available (CPU mode or error)')
			device = null
		}

		// Get VRAM info
		let totalVramMb: number | null = null
		let usedVramMb: number | null = null
		if (type !== 'cpu') {
			try {
				const vramState = await llama.getVramState()
				totalVramMb = Math.round(vramState.total / (1024 * 1024))
				usedVramMb = Math.round(vramState.used / (1024 * 1024))
				Log().debug('APP', `GPU info: VRAM total=${totalVramMb}MB, used=${usedVramMb}MB`)
			} catch (err) {
				Log().debug('APP', 'GPU info: VRAM info not available')
				totalVramMb = null
				usedVramMb = null
			}
		}

		const result = {
			type,
			device,
			totalVramMb,
			usedVramMb,
		}
		Log().debug('APP', 'GPU info: completed successfully', JSON.stringify(result))
		return result
	} catch (err) {
		// If we can't get GPU info, return null instead of throwing
		Log().error('APP', 'GPU info: unexpected error', String(err))
		return null
	}
}
