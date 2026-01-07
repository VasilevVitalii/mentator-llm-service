import { SPromtOptions, SPromtOptionsJson, defVal, defValJson } from './promtOptions/index.js';
import { Value } from '@sinclair/typebox/value';
export { SPromtOptions, SPromtOptionsJson } from './promtOptions/index.js';
/**
 * Parses and validates prompt options from a raw object.
 *
 * @param use - Schema type to use: 'core' for standard AI models, 'json' for structured JSON output
 * @param raw - Raw object containing option values to parse
 * @param useAllOptions - If true, returns all options with defaults; if false, returns only specified options (default: true)
 * @returns Validated TPromtOptions object. Invalid values are replaced with defaults. Never throws errors.
 *
 * @example
 * ```typescript
 * // Get all options with defaults
 * const options = PromtOptionsParse('core', { temperature: 0.7 })
 * // Returns: { temperature: 0.7, topP: 0.9, topK: 40, ... all other defaults }
 *
 * // Get only specified options
 * const options = PromtOptionsParse('core', { temperature: 0.7 }, false)
 * // Returns: { temperature: 0.7 }
 * ```
 */
export function PromtOptionsParse(use, raw, useAllOptions = true) {
    const schema = use === 'core' ? SPromtOptions : SPromtOptionsJson;
    const defaults = use === 'core' ? defVal : defValJson;
    const input = raw && typeof raw === 'object' ? raw : {};
    const result = {};
    for (const key of Object.keys(defaults)) {
        const inputValue = input[key];
        const defaultValue = defaults[key];
        if (inputValue === undefined) {
            if (useAllOptions) {
                result[key] = defaultValue;
            }
            continue;
        }
        const propertySchema = schema.properties[key];
        if (propertySchema && Value.Check(propertySchema, inputValue)) {
            result[key] = inputValue;
        }
        else {
            if (useAllOptions) {
                result[key] = defaultValue;
            }
        }
    }
    if (input.seed !== undefined) {
        const seedSchema = schema.properties.seed;
        if (seedSchema && Value.Check(seedSchema, input.seed)) {
            result.seed = input.seed;
        }
    }
    return result;
}
/**
 * Loads and parses prompts from a text string with structured sections.
 *
 * @param raw - Raw text string containing prompts in the format with $$begin/$$end markers
 * @param use - Schema type for options validation: 'core' for standard AI models, 'json' for structured JSON output (default: 'core')
 * @returns Array of parsed TPromt objects
 *
 * @remarks
 * Text format supports the following sections:
 * - `$$begin` / `$$end` - Marks prompt boundaries
 * - `$$system` - System message (optional)
 * - `$$user` - User message (required)
 * - `$$options` - Model parameters in key=value format (optional)
 * - `$$segment=name` - Named content segments (optional)
 *
 * @example
 * ```typescript
 * const text = `$$begin
 * $$options
 * temperature=0.7
 * maxTokens=2048
 * $$system
 * You are a helpful assistant
 * $$user
 * Hello, world!
 * $$end`
 *
 * const prompts = PromtLoad(text)
 * // Returns: [{ system: '...', user: '...', options: { temperature: 0.7, maxTokens: 2048 } }]
 * ```
 */
export function PromtLoad(raw, use = 'core') {
    return parse(raw, use);
}
/**
 * Serializes prompt objects into a text string with structured sections.
 *
 * @param promt - Array of TPromt objects to serialize
 * @returns Formatted text string with $$begin/$$end markers and sections
 *
 * @remarks
 * Output format structure:
 * - Each prompt is wrapped in `$$begin` / `$$end`
 * - Sections are ordered: $$options, $$system, $$user, $$segment=*
 * - Options are serialized in key=value format
 * - Arrays are serialized as JSON
 *
 * @example
 * ```typescript
 * const prompts: TPromt[] = [{
 *   system: 'You are helpful',
 *   user: 'Hello!',
 *   options: { temperature: 0.7 }
 * }]
 *
 * const text = PromtStore(prompts)
 * // Returns:
 * // $$begin
 * // $$options
 * // temperature=0.7
 * // $$system
 * // You are helpful
 * // $$user
 * // Hello!
 * // $$end
 * ```
 */
export function PromtStore(promt) {
    return serialize(promt);
}
function parse(content, use) {
    const lines = content.split('\n');
    const promts = [];
    let inBlock = false;
    let currentPromt = null;
    let currentSection = null;
    let currentSegmentName = null;
    let sectionContent = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '$$begin') {
            if (inBlock && currentPromt) {
                if (currentSection && sectionContent.length > 0) {
                    finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
                }
                if (currentPromt.user) {
                    promts.push(currentPromt);
                }
            }
            inBlock = true;
            currentPromt = {};
            currentSection = null;
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed === '$$end') {
            if (inBlock && currentPromt) {
                if (currentSection && sectionContent.length > 0) {
                    finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
                }
                if (currentPromt.user) {
                    promts.push(currentPromt);
                }
            }
            inBlock = false;
            currentPromt = null;
            currentSection = null;
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (!inBlock || !currentPromt) {
            continue;
        }
        if (trimmed === '$$system') {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
            }
            currentSection = 'system';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed === '$$user') {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
            }
            currentSection = 'user';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed === '$$options') {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
            }
            currentSection = 'options';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed.startsWith('$$segment=')) {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
            }
            currentSection = 'segment';
            currentSegmentName = trimmed.substring('$$segment='.length).trim();
            sectionContent = [];
            continue;
        }
        if (currentSection) {
            sectionContent.push(line);
        }
    }
    if (inBlock && currentPromt) {
        if (currentSection && sectionContent.length > 0) {
            finishSection(currentPromt, currentSection, sectionContent, use, currentSegmentName);
        }
        if (currentPromt.user) {
            promts.push(currentPromt);
        }
    }
    return promts;
}
function finishSection(promt, section, lines, use, segmentName) {
    const content = lines.join('\n').trim();
    if (section === 'system') {
        promt.system = content;
    }
    else if (section === 'user') {
        promt.user = content;
    }
    else if (section === 'segment' && segmentName) {
        if (!promt.segment) {
            promt.segment = {};
        }
        promt.segment[segmentName] = content;
    }
    else if (section === 'options') {
        const rawOptions = parseOptionsToObject(content);
        promt.options = PromtOptionsParse(use, rawOptions, false);
    }
}
function parseOptionsToObject(content) {
    const options = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0)
            continue;
        const key = trimmed.substring(0, eqIndex).trim();
        const valueStr = trimmed.substring(eqIndex + 1).trim();
        const value = parseOptionValue(valueStr);
        if (value !== undefined) {
            options[key] = value;
        }
    }
    return options;
}
function parseOptionValue(valueStr) {
    // Пустое значение = undefined
    if (valueStr === '') {
        return undefined;
    }
    // Убираем кавычки если есть
    let cleanValue = valueStr;
    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.slice(1, -1);
    }
    // Пробуем распарсить как JSON (для массивов)
    if (valueStr.startsWith('[')) {
        try {
            const parsed = JSON.parse(valueStr);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch (_a) {
            // Игнорируем ошибку, попробуем другие варианты
        }
    }
    // Boolean значения
    const lower = cleanValue.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'y')
        return true;
    if (lower === 'false' || lower === '0' || lower === 'n')
        return false;
    // Числовые значения - заменяем запятую на точку
    const numValue = cleanValue.replace(',', '.');
    const parsed = parseFloat(numValue);
    if (!isNaN(parsed)) {
        return parsed;
    }
    return undefined;
}
function serialize(promts) {
    const result = [];
    for (const promt of promts) {
        result.push('$$begin');
        if (promt.options) {
            result.push('$$options');
            for (const [key, value] of Object.entries(promt.options)) {
                result.push(serializeOptionValue(key, value));
            }
        }
        if (promt.system) {
            result.push('$$system');
            result.push(promt.system);
        }
        result.push('$$user');
        result.push(promt.user);
        if (promt.segment) {
            for (const [key, value] of Object.entries(promt.segment)) {
                result.push(`$$segment=${key}`);
                result.push(value);
            }
        }
        result.push('$$end');
    }
    return result.join('\n');
}
function serializeOptionValue(key, value) {
    if (value === undefined) {
        return `${key}=`;
    }
    if (Array.isArray(value)) {
        return `${key}=${JSON.stringify(value)}`;
    }
    return `${key}=${value}`;
}
//# sourceMappingURL=index.js.map