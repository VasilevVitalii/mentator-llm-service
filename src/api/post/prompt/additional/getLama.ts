import { getLlama, type Llama } from 'node-llama-cpp'
import type { TResultCode } from '../../../../tresult'

let llama: Llama | undefined = undefined

export async function GetLama(): Promise<TResultCode<Llama>> {
    try {
        if (!llama) {
            llama = await getLlama()
        }
        return {ok: true, result: llama}
    } catch (err) {
        return { ok: false, error: `on load llama: ${err}`, errorCode: 500 }
    }
}
