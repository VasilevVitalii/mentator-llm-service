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
        if (trimmed.startsWith('$$segment=')) {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
            }
            currentSection = 'segment';
            currentSegmentName = trimmed.substring('$$segment='.length).trim();
            sectionContent = [];
            continue;
        }
        if (trimmed.startsWith('$$@')) {
            if (currentSection && sectionContent.length > 0) {
                finishSection(currentPromt, currentSection, sectionContent, currentSegmentName);
                currentSection = null;
                currentSegmentName = null;
                sectionContent = [];
            }
            const paramLine = trimmed.substring(3);
            const eqIndex = paramLine.indexOf('=');
            if (eqIndex > 0) {
                const key = paramLine.substring(0, eqIndex).trim();
                const value = paramLine.substring(eqIndex + 1).trim();
                if (key) {
                    if (!currentPromt.options) {
                        currentPromt.options = {};
                    }
                    currentPromt.options[key] = value;
                }
            }
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
}
function serialize(promts) {
    const result = [];
    for (const promt of promts) {
        result.push('$$begin');
        if (promt.options) {
            for (const [key, value] of Object.entries(promt.options)) {
                result.push(`$$@${key}=${value}`);
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
//# sourceMappingURL=index.js.map