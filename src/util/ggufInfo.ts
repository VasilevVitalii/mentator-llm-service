import { openSync, readSync, closeSync } from 'fs'

const GGUF_MAGIC = 0x46554747 // "GGUF" in little-endian

// Byte sizes for scalar GGUF value types
const GGUF_TYPE_SIZE: Record<number, number> = {
	0: 1,  // UINT8
	1: 1,  // INT8
	2: 2,  // UINT16
	3: 2,  // INT16
	4: 4,  // UINT32
	5: 4,  // INT32
	6: 4,  // FLOAT32
	7: 1,  // BOOL
	10: 8, // UINT64
	11: 8, // INT64
	12: 8, // FLOAT64
}

export type TGgufInfo = {
	blockCount?: number
	isReasoning?: boolean
}

// Read blockCount from the first chunk (it's always in early KV pairs)
function readBlockCount(data: Buffer): number | undefined {
	let pos = 0
	if (data.length < 12) return undefined
	if (data.readUInt32LE(0) !== GGUF_MAGIC) return undefined
	pos = 4

	const version = data.readUInt32LE(pos); pos += 4
	pos += version === 1 ? 4 : 8 // skip tensor_count

	if (pos + (version === 1 ? 4 : 8) > data.length) return undefined
	let kvCount: number
	if (version === 1) {
		kvCount = data.readUInt32LE(pos); pos += 4
	} else {
		kvCount = data.readUInt32LE(pos); pos += 8
	}

	for (let i = 0; i < kvCount; i++) {
		if (pos + 8 > data.length) break
		const keyLen = data.readUInt32LE(pos); pos += 8
		if (pos + keyLen > data.length) break
		const key = data.subarray(pos, pos + keyLen).toString('utf8')
		pos += keyLen
		if (pos + 4 > data.length) break
		const valueType = data.readUInt32LE(pos); pos += 4

		if (key.endsWith('.block_count') && valueType === 4 /* UINT32 */) {
			if (pos + 4 > data.length) break
			return data.readUInt32LE(pos)
		}

		if (valueType === 8 /* STRING */) {
			if (pos + 8 > data.length) break
			const strLen = data.readUInt32LE(pos); pos += 8
			pos += strLen
		} else if (valueType === 9 /* ARRAY */) {
			if (pos + 12 > data.length) break
			const elemType = data.readUInt32LE(pos); pos += 4
			const count = data.readUInt32LE(pos); pos += 8
			if (elemType === 8 /* STRING */) {
				for (let j = 0; j < count; j++) {
					if (pos + 8 > data.length) return undefined
					const strLen = data.readUInt32LE(pos); pos += 8
					pos += strLen
				}
			} else {
				const elemSize = GGUF_TYPE_SIZE[elemType]
				if (!elemSize) return undefined
				pos += elemSize * count
			}
		} else {
			const size = GGUF_TYPE_SIZE[valueType]
			if (!size) return undefined
			pos += size
		}
	}
	return undefined
}

// Search for chat_template by scanning file in chunks for the GGUF key pattern.
// The binary pattern is: [0x17,0,0,0,0,0,0,0] + "tokenizer.chat_template" + [0x08,0,0,0]
// (uint64 key length = 23, value type = 8 = STRING)
function readIsReasoning(fd: number): boolean | undefined {
	const KEY = 'tokenizer.chat_template'
	const KEY_LEN_BYTES = Buffer.alloc(8); KEY_LEN_BYTES.writeUInt32LE(KEY.length, 0)
	const KEY_BYTES = Buffer.from(KEY)
	const VALUE_TYPE_STRING = Buffer.from([0x08, 0x00, 0x00, 0x00])
	// Full needle: 8-byte length prefix + key + 4-byte value type
	const NEEDLE = Buffer.concat([KEY_LEN_BYTES, KEY_BYTES, VALUE_TYPE_STRING])

	const CHUNK = 256 * 1024
	const OVERLAP = NEEDLE.length - 1
	const buf = Buffer.alloc(CHUNK + OVERLAP)
	let fileOffset = 0
	let prevTail = 0

	while (true) {
		const bytesRead = readSync(fd, buf, prevTail, CHUNK, fileOffset)
		if (bytesRead === 0) break
		const data = buf.subarray(0, prevTail + bytesRead)

		const idx = data.indexOf(NEEDLE)
		if (idx !== -1) {
			// Found the key; read the string value
			const strLenOffset = idx + NEEDLE.length
			if (strLenOffset + 8 > data.length) {
				// Need to read more for the string length
				const extra = Buffer.alloc(8)
				readSync(fd, extra, 0, 8, fileOffset + bytesRead - (data.length - strLenOffset))
				const strLen = extra.readUInt32LE(0)
				const templateBuf = Buffer.alloc(Math.min(strLen, 65536))
				readSync(fd, templateBuf, 0, templateBuf.length, fileOffset + bytesRead - (data.length - strLenOffset) + 8)
				const template = templateBuf.toString('utf8')
				return template.includes('<think>') || template.includes('</think>')
			}
			const strLen = data.readUInt32LE(strLenOffset) // lower 32 bits of uint64
			const templateStart = strLenOffset + 8
			const readLen = Math.min(strLen, 65536)
			let template: string
			if (templateStart + readLen <= data.length) {
				template = data.subarray(templateStart, templateStart + readLen).toString('utf8')
			} else {
				const templateBuf = Buffer.alloc(readLen)
				readSync(fd, templateBuf, 0, readLen, fileOffset + (templateStart - prevTail))
				template = templateBuf.toString('utf8')
			}
			return template.includes('<think>') || template.includes('</think>')
		}

		if (bytesRead < CHUNK) break // EOF
		// Keep overlap to catch patterns split across chunks
		data.copy(buf, 0, data.length - OVERLAP, data.length)
		prevTail = OVERLAP
		fileOffset += bytesRead
	}
	return undefined
}

export function readGgufInfo(filePath: string): TGgufInfo {
	try {
		const HEADER_CHUNK = 256 * 1024
		const headerBuf = Buffer.alloc(HEADER_CHUNK)
		const fd = openSync(filePath, 'r')
		const bytesRead = readSync(fd, headerBuf, 0, HEADER_CHUNK, 0)

		const result: TGgufInfo = {}
		result.blockCount = readBlockCount(headerBuf.subarray(0, bytesRead))
		result.isReasoning = readIsReasoning(fd)

		closeSync(fd)
		return result
	} catch {
		return {}
	}
}
