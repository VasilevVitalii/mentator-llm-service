import { GetLama } from './getLama'

export type TGpuInfo = {
	type: 'cuda' | 'vulkan' | 'metal' | 'cpu'
	device: string | null
	totalVramMb: number | null
	usedVramMb: number | null
}

export async function GetGpuInfo(): Promise<TGpuInfo | null> {
	try {
		const llamaResult = await GetLama()

		if (!llamaResult.ok || !llamaResult.result) {
			return null
		}

		const llama = llamaResult.result

		// Get GPU type
		const gpuType = llama.gpu
		const type: TGpuInfo['type'] = gpuType === false ? 'cpu' : gpuType

		// Get device name (first device if multiple)
		let device: string | null = null
		try {
			const deviceNames = await llama.getGpuDeviceNames()
			device = deviceNames.length > 0 ? deviceNames[0] ?? null : null
		} catch (err) {
			// GPU device names might not be available for CPU mode
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
				// VRAM info might not be available
				totalVramMb = null
				usedVramMb = null
			}
		}

		return {
			type,
			device,
			totalVramMb,
			usedVramMb,
		}
	} catch (err) {
		// If we can't get GPU info, return null instead of throwing
		console.error('Failed to get GPU info:', err)
		return null
	}
}
