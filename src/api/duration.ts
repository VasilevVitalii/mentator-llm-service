export class Duration {
    private _startTime = Date.now()

    getMsec(): number {
        return Date.now() - this._startTime
    }
}