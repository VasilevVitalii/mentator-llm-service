import pg from 'pg'

export type PgConnection = {
    exec(script: string, params?: any[]): Promise<any[]>
    disconnect(): Promise<void>
}

/**
 * Open a connection to a PostgreSQL database.
 *
 * @param host - Database server hostname or IP address.
 * @param port - Database server port (typically 5432).
 * @param database - Name of the database to connect to.
 * @param login - Database user name.
 * @param password - Database user password.
 * @returns Connection object with exec() and disconnect().
 *
 * @example
 * const conn = await LIB.db.pg.connect('localhost', 5432, 'mydb', 'user', 'pass')
 * const rows = await conn.exec('SELECT * FROM entity WHERE id = $1', [42])
 * await conn.disconnect()
 */
export async function connect(host: string, port: number, database: string, login: string, password: string): Promise<PgConnection> {
    const client = new pg.Client({ host, port, database, user: login, password })
    await client.connect()

    return {
        async exec(script: string, params?: any[]): Promise<any[]> {
            let trimmedParams: any[] | undefined
            if (params && params.length > 0) {
                const maxIdx = Math.max(0, ...[...script.matchAll(/\$(\d+)/g)].map(m => parseInt(m[1]!)))
                trimmedParams = maxIdx > 0 ? params.slice(0, maxIdx) : undefined
            }
            const result = await client.query(script, trimmedParams)
            return result.rows
        },
        async disconnect(): Promise<void> {
            await client.end()
        },
    }
}
