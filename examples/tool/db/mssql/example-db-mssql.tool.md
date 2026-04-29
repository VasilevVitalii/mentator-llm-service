# Example: count tables in a Microsoft SQL Server schema

Files to deploy:
- `toolDir` ← `example-db-mssql.tool.txt` — executes a SQL query
- `toolEnvDir` ← `example-db-mssql-conn.toolenv.txt` — connection parameters (JSON)

The tool code references `{{example-db-mssql-conn}}` which is resolved at runtime from `toolEnvDir`.
No connection fields are exposed to the LLM — only `query` and `params`.

```bash
curl -s -X POST http://localhost:3000/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-0.5b-instruct-q5_k_m.gguf",
    "message": { "user": "How many tables are in schema myScheme?" },
    "durationMsec": 60000,
    "toolServer": ["db-mssql"]
  }'
```

Expected model behaviour:
1. Calls `db-mssql` with `{ "query": "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = @p1", "params": ["myScheme"] }`
2. Service resolves `{{example-db-mssql-conn}}` from `toolEnvDir`, connects to SQL Server, runs the query
3. Returns the count to the user
