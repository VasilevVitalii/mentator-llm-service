export function PromtLoad(raw) {
    return parse(raw);
}
export function PromtStore(promt) {
    return serialize(promt);
}
function parse(content) {
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
                    finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
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
                    finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
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
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
            }
            currentSection = 'system';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed === '$$user') {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
            }
            currentSection = 'user';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed === '$$options') {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
            }
            currentSection = 'options';
            currentSegmentName = null;
            sectionContent = [];
            continue;
        }
        if (trimmed.startsWith('$$segment=')) {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
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
            finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
        }
        if (currentPromt.user) {
            promts.push(currentPromt);
        }
    }
    return promts;
}
function finishSection(promt, section, lines, segmentName) {
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
        promt.options = parseOptions(content);
    }
}
function parseOptions(content) {
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
        // Пропускаем неизвестные ключи
        if (!isValidOptionKey(key))
            continue;
        const value = parseOptionValue(key, valueStr);
        if (value !== undefined) {
            options[key] = value;
        }
    }
    return options;
}
function isValidOptionKey(key) {
    const validKeys = [
        'temperature', 'topP', 'topK', 'minP', 'maxTokens',
        'repeatPenalty', 'repeatPenaltyNum', 'presencePenalty',
        'frequencyPenalty', 'mirostat', 'mirostatTau', 'mirostatEta',
        'penalizeNewline', 'stopSequences', 'trimWhitespace'
    ];
    return validKeys.includes(key);
}
function parseOptionValue(key, valueStr) {
    // Пустое значение = undefined
    if (valueStr === '') {
        return undefined;
    }
    // Убираем кавычки если есть
    let cleanValue = valueStr;
    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.slice(1, -1);
    }
    // Массив для stopSequences
    if (key === 'stopSequences') {
        try {
            const parsed = JSON.parse(valueStr);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch (_a) {
            return [];
        }
        return [];
    }
    // Boolean значения
    if (key === 'penalizeNewline' || key === 'trimWhitespace') {
        const lower = cleanValue.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'y')
            return true;
        if (lower === 'false' || lower === '0' || lower === 'n')
            return false;
        return undefined;
    }
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