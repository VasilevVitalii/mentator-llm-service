import { getLlama, type Llama } from 'node-llama-cpp'
import type { TResultCode } from '../../../../tresult'

let llama: Llama | undefined = undefined

export async function GetLama(): Promise<TResultCode<Llama>> {
    try {
        if (!llama) {
            // Let node-llama-cpp auto-detect GPU based on environment variables
            // Environment variables are set by start-docker.sh: LLAMA_CUDA=1, LLAMA_HIPBLAS=1, or LLAMA_METAL=1
            llama = await getLlama()
        }
        return {ok: true, result: llama}
    } catch (err) {
        return { ok: false, error: `on load llama: ${err}`, errorCode: 500 }
    }
}
