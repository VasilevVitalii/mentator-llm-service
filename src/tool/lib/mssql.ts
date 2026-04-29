import sql from 'mssql'

export type MssqlConnection = {
    exec(script: string, params?: any[]): Promise<any[]>
    disconnect(): Promise<void>
}

/**
 * Open a connection to a Microsoft SQL Server database.
 *
 * @param host - Database server hostname or IP address.
 * @param port - Database server port (typically 1433).
 * @param database - Name of the database to connect to.
 * @param login - Database user name.
 * @param password - Database user password.
 * @returns Connection object with exec() and disconnect().
 *
 * @example
 * const conn = await LIB.db.mssql.connect('localhost', 1433, 'mydb', 'user', 'pass')
 * const rows = await conn.exec('SELECT * FROM entity WHERE id = @p1', [42])
 * await conn.disconnect()
 *
 * @note SQL parameters use named syntax: @p1, @p2, @p3, ... matching the params array by index.
 */
export async function connect(host: string, port: number, database: string, login: string, password: string): Promise<MssqlConnection> {
    const pool = await sql.connect({
        server: host,
        port,
        database,
        user: login,
        password,
        options: { encrypt: false, trustServerCertificate: true },
    })

    return {
        async exec(script: string, params?: any[]): Promise<any[]> {
            const request = pool.request()
            if (params && params.length > 0) {
                const maxIdx = Math.max(0, ...[...script.matchAll(/@p(\d+)/g)].map(m => parseInt(m[1]!)))
                const trimmedParams = params.slice(0, maxIdx)
                trimmedParams.forEach((value, index) => {
                    request.input(`p${index + 1}`, value)
                })
            }
            const result = await request.query(script)
            return result.recordset ?? []
        },
        async disconnect(): Promise<void> {
            await pool.close()
        },
    }
}
