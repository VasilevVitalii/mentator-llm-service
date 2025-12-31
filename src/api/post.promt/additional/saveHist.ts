import { Db } from "../../../db";
import { Log } from "../../../log";

export async function saveHist(
	code: number,
	body: any,
	response: any,
	duration: { promtMsec: number; queueMsec: number },
	allowSavePromtExtra: boolean,
) {
	const { requestKB, responseKB, ts } = await Db().editSavePromt(code, body, response, duration, allowSavePromtExtra)
	const message = `queue=${duration.queueMsec}ms, promt=${duration.promtMsec}ms, request=${requestKB}KB, response=${responseKB}KB`
	const extra = `Request:\n${JSON.stringify(body)}\n\nResponse:\n${JSON.stringify(response)}`
	const pipe = `POST.PROMT.${code}`

	if (code === 200) {
		Log().trace({ pipe, message, extra, ts })
	} else {
		Log().error({ pipe, message, extra, ts })
	}
}