import type { TResultCode } from '../../../tresult'
import Ajv from 'ajv'

const ajv = new Ajv()

export function GetResponseValidation(responseJson: any, format: any | undefined): TResultCode<null> {
    try {
        if (!format) {
            return {ok: true, result: null}
        }
        const validate = ajv.compile(format)
        const isValid = validate(responseJson)
        if (!isValid) {
            return {ok: false, errorCode: 400, error: `JSON Schema validation failed: ${validate.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ')}`}
        }
        return {ok: true, result: null}
    } catch (err) {
        return { ok: false, error: `on validate response: ${err}`, errorCode: 500 }
    }
}