# Example: count tables in a PostgreSQL schema

Files to deploy:
- `toolDir` ← `example-db-pg.tool.txt` — executes a SQL query
- `toolEnvDir` ← `example-db-pg-conn.toolenv.txt` — connection parameters (JSON)

The tool code references `{{example-db-pg-conn}}` which is resolved at runtime from `toolEnvDir`.
No connection fields are exposed to the LLM — only `query` and `params`.

```bash
curl -s -X POST http://localhost:3000/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": { "user": "How many tables are in schema myScheme?" },
    "durationMsec": 60000,
    "toolServer": ["db-pg"]
  }'
```

Expected model behaviour:
1. Calls `db-pg` with `{ "query": "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1", "params": ["myScheme"] }`
2. Service resolves `{{example-db-pg-conn}}` from `toolEnvDir`, connects to PostgreSQL, runs the query
3. Returns the count to the user
