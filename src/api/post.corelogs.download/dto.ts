import { Type, Static } from '@sinclair/typebox'

export const CoreLogsDownloadRequestDto = Type.Object({
	date: Type.String(),
})

export type TCoreLogsDownloadRequest = Static<typeof CoreLogsDownloadRequestDto>
