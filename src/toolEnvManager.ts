import type { TResult } from './tresult'
import { fsReadDir } from './util/fsReadDir'
import { singleton } from './util/singleton'
import { ClassLogger } from './util/classLogger'
import { basename, dirname, join } from 'path'
import { CheckJsonToolSpec } from 'vv-ai-prompt-format'
import { fsReadFileSync } from './util/fsReadFile'

const PIPE = 'MANAGER.TOOLENV'
const FILE_TAIL = '.toolenv.txt'

export type TToolEnvFile = {
    relativeFileName: string
    name: string,
    params: object
}

class ToolEnvManagerClass extends ClassLogger {
    private _toolEnvDir: string
    private _toolEnvFileList: TToolEnvFile[] = []
    private _scanTimeout: NodeJS.Timeout | null = null

    private _fromText(name: string, text: string): TResult<object> {
        try {
            return {ok: true, result: JSON.parse(text)}
        } catch (err) {
            return {ok: false, error: `env tool "${name}": ${err}`}
        }
    }

    private async _scanToolEnvDir() {
        const fileListRes = await fsReadDir(this._toolEnvDir)
        if (!fileListRes.ok) {
            this._onError('_scanToolEnvDir', fileListRes.error)
            this._toolEnvFileList = []
            return
        }
        const toolEnvFileList = [] as TToolEnvFile[]
        const fileNew = [] as string[]
        const fileRemove = [] as string[]

        fileListRes.result.forEach(fileItem => {
            if (!fileItem.relativeFileName) return
            if (!fileItem.relativeFileName.toLowerCase().endsWith(FILE_TAIL)) return
            if (!fileItem.sizeKb) return
            let name = basename(fileItem.relativeFileName)
            if (toolEnvFileList.some(f => f.name === name)) {
                name = `${name} (${dirname(fileItem.relativeFileName)})`
            }
            const readToolRes = fsReadFileSync(join(this._toolEnvDir, fileItem.relativeFileName))
            if (!readToolRes.ok) {
                this._onError('_scanToolDir', readToolRes.error)
                return
            }
            const convertToolRes = this._fromText(name, readToolRes.result)
            if (!convertToolRes.ok) {
                this._onError('_scanToolDir', convertToolRes.error)
                return
            }

            toolEnvFileList.push({
                name: name,
                relativeFileName: fileItem.relativeFileName,
                params: convertToolRes.result
            })
            if (!this._toolEnvFileList.some(f => f.name === name)) {
                fileNew.push(name)
            }
        })
        this._toolEnvFileList.forEach(existsFileItem => {
            if (!toolEnvFileList.some(f => f.name === existsFileItem.name)) {
                fileRemove.push(existsFileItem.name)
            }
        })

        this._toolEnvFileList = toolEnvFileList
        let logText = ''
        if (fileRemove.length > 0) {
            logText = `remove env tool(s): "${fileRemove.join('", "')}";`
        }
        if (fileNew.length > 0) {
            logText = `${logText}${logText.length > 0 ? ' ' : ''}add env tool(s): "${fileNew.join('", "')}";`
        }
        if (logText.length > 0) {
            this._onLog(logText)
        }
    }

    constructor(toolDir: string) {
        super(PIPE)
        this._toolEnvDir = toolDir
    }

    scanToolEnvDirStart(intervalMsec: number): void {
        this.scanToolEnvDirStop()
        this._scanToolEnvDir().then(() => {
            const scheduleNext = () => {
                this._scanTimeout = setTimeout(() => {
                    this._scanToolEnvDir().then(() => {
                        scheduleNext()
                    })
                }, intervalMsec)
            }
            scheduleNext()
        })
    }

    scanToolEnvDirStop(): void {
        if (this._scanTimeout) {
            clearTimeout(this._scanTimeout)
            this._scanTimeout = null
        }
    }

    getEnvTool(name: string): (TToolEnvFile & { fullFileName: string }) | undefined {
        let tool = this._toolEnvFileList.find(f => (f.name || '').toLowerCase() === (name || '').toLowerCase())
        if (!tool) {
            tool = this._toolEnvFileList.find(f => (f.name || '').toLowerCase() === (`${name}${FILE_TAIL}` || '').toLowerCase())
        }
        if (!tool) {
            return undefined
        }
        return {
            fullFileName: join(this._toolEnvDir, tool.relativeFileName),
            ...tool,
        }
    }
}

export const ToolEnvManager = singleton(ToolEnvManagerClass)
