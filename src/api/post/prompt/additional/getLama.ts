import { getLlama, type Llama } from 'node-llama-cpp'
import type { TResultCode } from '../../../../tresult'

let llama: Llama | undefined = undefined

export async function GetLama(): Promise<TResultCode<Llama>> {
    try {
        if (!llama) {
            // Let node-llama-cpp auto-detect GPU and use prebuilt binaries
            // Environment variables are set by start-docker.sh: LLAMA_CUDA=1, LLAMA_HIPBLAS=1, or LLAMA_METAL=1
            llama = await getLlama()
        }
        return {ok: true, result: llama}
    } catch (err) {
        return { ok: false, error: `on load llama: ${err}`, errorCode: 500 }
    }
}

// Get already initialized Llama instance without creating a new one
export function GetLamaIfExists(): Llama | null {
    return llama || null
}
