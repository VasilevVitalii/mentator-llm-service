export class Duration {
    private _startTime = Date.now()
    private _addMsec = 0

    constructor (addMsec?: number) {
        if (addMsec) this._addMsec = addMsec
    }

    getMsec(): number {
        return Date.now() - this._startTime + this._addMsec
    }
}