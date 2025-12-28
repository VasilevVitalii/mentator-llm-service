export function convertJsonSchemaToGbnf(schema: any): any {
	if (schema.type === 'array' && schema.items) {
		return {
			type: 'array' as const,
			items: convertJsonSchemaToGbnf(schema.items),
		}
	}
	if (schema.type === 'object' && schema.properties) {
		const properties: Record<string, any> = {}
		for (const [key, value] of Object.entries(schema.properties)) {
			properties[key] = convertJsonSchemaToGbnf(value as any)
		}

		return {
			type: 'object' as const,
			properties,
			additionalProperties: schema.additionalProperties === true ? true : false,
		}
	}
	if (schema.type === 'string') {
		return { type: 'string' as const }
	}
	if (schema.type === 'number') {
		return { type: 'number' as const }
	}
	if (schema.type === 'integer') {
		return { type: 'integer' as const }
	}
	if (schema.type === 'boolean') {
		return { type: 'boolean' as const }
	}
	if (schema.type === 'null') {
		return { type: 'null' as const }
	}
	if (schema.enum) {
		return { enum: schema.enum as readonly (string | number | boolean | null)[] }
	}
	if (schema.const !== undefined) {
		return { const: schema.const }
	}
	throw new Error(`Unsupported JSON Schema format: ${JSON.stringify(schema)}`)
}