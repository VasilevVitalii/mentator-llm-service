import { LlamaChatSession } from 'node-llama-cpp'
import type { TResultCode } from '../../../tresult'
import type { TGenerationParams } from './getGenerationParams'

export async function GetResponse(session: LlamaChatSession, message: string, params: TGenerationParams, durationMsec: number): Promise<TResultCode<any>> {
    try {
        const responseTextRes = await GetResponseText(session, message, params, durationMsec)
        if (!responseTextRes.ok) {
            return responseTextRes
        }
        if (!responseTextRes) {
            return {ok: false, errorCode: 400, error: 'response text - empty string'}
        }
        let text = responseTextRes.result.trim()
        const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
        if (jsonMatch && jsonMatch[1]) {
            text = jsonMatch[1].trim()
        }
        const json = JSON.parse(text)
        return {ok: true, result: json}
    } catch (err) {
        return { ok: false, error: `on convert response text to JSON: ${err}`, errorCode: 400 }
    }
}

async function GetResponseText(session: LlamaChatSession, message: string, params: TGenerationParams, durationMsec: number): Promise<TResultCode<string>> {
    let timeoutId = undefined as NodeJS.Timeout | undefined
    let responseText = ''
    try {
        const abortController = new AbortController()
        timeoutId = setTimeout(() => abortController.abort(), durationMsec)

        responseText = await session.prompt(message, {
            ...params,
            signal: abortController.signal,
        })

        return {ok: true, result: responseText}
    } catch (err: any) {
        if (err.name === 'AbortError') {
            return {ok: false, errorCode: 400, error: 'cancelled ty timeout'}
        } else {
            return {ok: false, errorCode: 500, error: `on get response text: ${err}`}
        }
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    }
}
