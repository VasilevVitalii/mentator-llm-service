import { Go } from "../src/go"

Go({
    port: 19778,
    modelDir: '/home/vitalii/GGUF/',
    dbFile: '/home/vitalii/Work/mentator/mentator-llm-service/debug/testdata/mentator-llm-service.db',
    defaultOptions: {
        temperature: 0.0,
        topP: 0.1,
        topK: 10,
        minP: 0.0,
        maxTokens: 4096,
        repeatPenalty: 1.0,
        repeatPenaltyNum: 0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        mirostat: 0,
        mirostatTau: 5.0,
        mirostatEta: 0.1,
        penalizeNewline: false,
        stopSequences: [],
        trimWhitespace: true,
    },
    log: {
        level: 'trace',
        liveDay: 100,
        savePrompt: true
    }
})