# Example: count tables in an Oracle schema

Files to deploy:
- `toolDir` ← `example-db-ora.tool.txt` — executes a SQL query
- `toolEnvDir` ← `example-db-ora-conn.toolenv.txt` — connection parameters (JSON)

The tool code references `{{example-db-ora-conn}}` which is resolved at runtime from `toolEnvDir`.
No connection fields are exposed to the LLM — only `query` and `params`.

```bash
curl -s -X POST http://localhost:3000/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": { "user": "How many tables are in schema myScheme?" },
    "durationMsec": 60000,
    "toolServer": ["db-ora"]
  }'
```

Expected model behaviour:
1. Calls `db-ora` with `{ "query": "SELECT COUNT(*) AS count FROM all_tables WHERE owner = :1", "params": ["MYSCHEME"] }`
2. Service resolves `{{example-db-ora-conn}}` from `toolEnvDir`, connects to Oracle, runs the query
3. Returns the count to the user

> Note: in Oracle the schema owner name is typically uppercase.
