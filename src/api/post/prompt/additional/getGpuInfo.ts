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
		// Get Llama instance (should be initialized at startup)
		const llama = GetLamaIfExists()

		if (!llama) {
			Log().debug('APP', 'GPU info: Llama not initialized')
			return null
		}

		// Get GPU type
		const gpuType = llama.gpu
		const type: TGpuInfo['type'] = gpuType === false ? 'cpu' : gpuType

		// Get device name (first device if multiple)
		let device: string | null = null
		try {
			const deviceNames = await llama.getGpuDeviceNames()
			device = deviceNames.length > 0 ? deviceNames[0] ?? null : null
		} catch (err) {
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
			} catch (err) {
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
		return result
	} catch (err) {
		// If we can't get GPU info, return null instead of throwing
		Log().error('APP', 'GPU info: unexpected error', String(err))
		return null
	}
}
