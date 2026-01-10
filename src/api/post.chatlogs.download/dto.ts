import { Type } from '@sinclair/typebox'

export const ChatLogsDownloadRequestDto = Type.Object({
	dateHour: Type.String(),
})

export type TChatLogsDownloadRequest = {
	dateHour: string
}
