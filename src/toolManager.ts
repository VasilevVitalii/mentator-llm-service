import type { TResult } from './tresult'
import { fsReadDir } from './util/fsReadDir'
import { singleton } from './util/singleton'
import { ClassLogger } from './util/classLogger'
import { basename, dirname, join } from 'path'
import { CheckJsonToolSpec } from 'vv-ai-prompt-format'
import { fsReadFileSync } from './util/fsReadFile'
import * as fs from 'fs'
import * as path from 'path'
import * as pg from './tool/lib/pg'
import * as mssql from './tool/lib/mssql'
import * as ora from './tool/lib/ora'
import { ToolEnvManager } from './toolEnvManager'

const FUNC = Object.getPrototypeOf(async function () {}).constructor
const LIB = { fs, path, math: Math, db: { pg, mssql, ora } }
const PIPE = 'MANAGER.TOOL'
const FILE_TAIL = '.tool.txt'

export type TToolFile = {
    relativeFileName: string
    name: string
    spec: string
    lang: 'JS' | 'PY'
    code: string
}

class ToolManagerClass extends ClassLogger {
    private _toolDir: string
    private _toolFileList: TToolFile[] = []
    private _scanTimeout: NodeJS.Timeout | null = null

    private _fromText(name: string, text: string): TResult<{ spec: string, lang: 'JS' | 'PY', code: string }> {
        let spec: string | undefined
        let lang: string | undefined
        let code: string | undefined

        let currentSection: 'spec' | 'code' | undefined
        let currentLang: string | undefined
        const currentLines: string[] = []

        const flushSection = () => {
            if (currentSection === 'spec') {
                spec = currentLines.join('\n').trim()
            } else if (currentSection === 'code' && currentLang) {
                code = currentLines.join('\n').trim()
                lang = currentLang
            }
            currentLines.length = 0
            currentSection = undefined
            currentLang = undefined
        }

        for (const line of text.split('\n')) {
            const trimmed = line.trimEnd()
            if (trimmed === '$$spec') {
                flushSection()
                currentSection = 'spec'
            } else if (trimmed.startsWith('$$code=')) {
                flushSection()
                currentSection = 'code'
                currentLang = trimmed.slice('$$code='.length).trim()
            } else if (currentSection !== undefined) {
                currentLines.push(line)
            }
        }
        flushSection()

        if (!spec) {
            return { ok: false, error: `tool "${name}": missing $$spec section` }
        }

        const specError = CheckJsonToolSpec(spec)
        if (specError) {
            return { ok: false, error: `tool "${name}": invalid $$spec - ${specError}` }
        }

        if (!lang) {
            return { ok: false, error: `tool "${name}": missing $$code section` }
        }
        if (lang !== 'JS' && lang !== 'PY') {
            return { ok: false, error: `tool "${name}": unknown lang "${lang}"` }
        }

        if (!code) {
            return { ok: false, error: `tool "${name}": $$code==${lang} section is empty` }
        }

        return { ok: true, result: { spec, lang, code } }
    }

    private async _scanToolDir() {
        const fileListRes = await fsReadDir(this._toolDir)
        if (!fileListRes.ok) {
            this._onError('_scanToolDir', fileListRes.error)
            this._toolFileList = []
            return
        }
        const toolFileList = [] as TToolFile[]
        const fileNew = [] as string[]
        const fileRemove = [] as string[]

        fileListRes.result.forEach(fileItem => {
            if (!fileItem.relativeFileName) return
            if (!fileItem.relativeFileName.toLowerCase().endsWith(FILE_TAIL)) return
            if (!fileItem.sizeKb) return
            let name = basename(fileItem.relativeFileName)
            if (toolFileList.some(f => f.name === name)) {
                name = `${name} (${dirname(fileItem.relativeFileName)})`
            }
            const readToolRes = fsReadFileSync(join(this._toolDir, fileItem.relativeFileName))
            if (!readToolRes.ok) {
                this._onError('_scanToolDir', readToolRes.error)
                return
            }
            const convertToolRes = this._fromText(name, readToolRes.result)
            if (!convertToolRes.ok) {
                this._onError('_scanToolDir', convertToolRes.error)
                return
            }

            toolFileList.push({
                name: name,
                relativeFileName: fileItem.relativeFileName,
                ...convertToolRes.result
            })
            if (!this._toolFileList.some(f => f.name === name)) {
                fileNew.push(name)
            }
        })
        this._toolFileList.forEach(existsFileItem => {
            if (!toolFileList.some(f => f.name === existsFileItem.name)) {
                fileRemove.push(existsFileItem.name)
            }
        })

        this._toolFileList = toolFileList
        let logText = ''
        if (fileRemove.length > 0) {
            logText = `remove tool(s): "${fileRemove.join('", "')}";`
        }
        if (fileNew.length > 0) {
            logText = `${logText}${logText.length > 0 ? ' ' : ''}add tool(s): "${fileNew.join('", "')}";`
        }
        if (logText.length > 0) {
            this._onLog(logText)
        }
    }

    private async _exec(lang: 'JS' | 'PY', code: string, args: Record<string, any>, env: Record<string, any> = {}): Promise<TResult<any>> {
        try {
            if (lang !== 'JS') {
                return { ok: false, error: `lang "${lang}" is not supported yet` }
            }
            const resolvedCode = code.replace(/\{\{([^}]+)\}\}/g, (_, name) => `ENV[${JSON.stringify(name.trim())}]`)
            const fn = new FUNC('args', 'LIB', 'ENV', resolvedCode)
            const result = await fn(args, LIB, env)
            return { ok: true, result }
        } catch (err) {
            return { ok: false, error: `${err}` }
        }
    }

    constructor(toolDir: string) {
        super(PIPE)
        this._toolDir = toolDir
    }

    scanToolDirStart(intervalMsec: number): void {
        this.scanToolDirStop()
        this._scanToolDir().then(() => {
            const scheduleNext = () => {
                this._scanTimeout = setTimeout(() => {
                    this._scanToolDir().then(() => {
                        scheduleNext()
                    })
                }, intervalMsec)
            }
            scheduleNext()
        })
    }

    scanToolDirStop(): void {
        if (this._scanTimeout) {
            clearTimeout(this._scanTimeout)
            this._scanTimeout = null
        }
    }

    getTool(name: string): (TToolFile & { fullFileName: string }) | undefined {
        let tool = this._toolFileList.find(f => (f.name || '').toLowerCase() === (name || '').toLowerCase())
        if (!tool) {
            tool = this._toolFileList.find(f => (f.name || '').toLowerCase() === (`${name}${FILE_TAIL}` || '').toLowerCase())
        }
        if (!tool) {
            return undefined
        }
        return {
            fullFileName: join(this._toolDir, tool.relativeFileName),
            ...tool,
        }
    }

    getToolList(): TToolFile[] {
        return this._toolFileList
    }

    resolveEnv(name: string): TResult<Record<string, any>> {
        const tool = this.getTool(name)
        if (!tool) {
            return {ok: false, error: `not find tool with name "${name}"`}
        }
        const env: Record<string, any> = {}
        for (const match of tool.code.matchAll(/\{\{([^}]+)\}\}/g)) {
            const envName = match[1]!.trim()
            if (envName in env) continue
            const envEntry = ToolEnvManager().getEnvTool(envName)
            if (!envEntry) {
                return {ok: false, error: `tool "${name}": env var "{{${envName}}}" not found in toolEnvDir`}
            }
            env[envName] = envEntry.params
        }
        return {ok: true, result: env}
    }

    async execServerSide(name: string, args: Record<string, any> = {}, env: Record<string, any> = {}): Promise<TResult<any>> {
        const tool = this.getTool(name)
        if (!tool) {
            return {ok: false, error: `not find tool with name "${name}"`}
        }
        const res = await this._exec(tool.lang, tool.code, args, env)
        if (!res.ok) {
            return {ok: false, error: `on use tool [${tool.lang}] "${tool.name}": ${res.error}`}
        }
        return res
    }
}

export const ToolManager = singleton(ToolManagerClass)
