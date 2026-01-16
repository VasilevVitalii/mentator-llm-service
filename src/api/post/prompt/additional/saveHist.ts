import { Db } from "../../../../db";
import { Log } from "../../../../log";

export async function saveHist(
	code: number,
	body: any,
	response: any,
	duration: { promptMsec: number; queueMsec: number },
	allowSavePromptExtra: boolean,
	ip?: string,
) {
	const { requestKB, responseKB, ts } = await Db().editSavePrompt(code, body, response, duration, allowSavePromptExtra)
	const ipPrefix = ip ? `[from ${ip}] ` : ''
	const message = `${ipPrefix}queue=${duration.queueMsec}ms, prompt=${duration.promptMsec}ms, request=${requestKB}KB, response=${responseKB}KB`
	const extra = `Request:\n${JSON.stringify(body)}\n\nResponse:\n${JSON.stringify(response)}`
	const pipe = `API.POST.PROMPT.${code}`

	if (code === 200) {
		Log().trace({ pipe, message, extra, ts })
	} else {
		Log().error({ pipe, message, extra, ts })
	}
}