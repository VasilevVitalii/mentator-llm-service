import oracledb from 'oracledb'

export type OraConnection = {
    exec(script: string, params?: any[]): Promise<any[]>
    disconnect(): Promise<void>
}

/**
 * Open a connection to an Oracle database.
 *
 * @param host - Database server hostname or IP address.
 * @param port - Database server port (typically 1521).
 * @param database - Service name or SID of the Oracle database.
 * @param login - Database user name.
 * @param password - Database user password.
 * @returns Connection object with exec() and disconnect().
 *
 * @example
 * const conn = await LIB.db.ora.connect('localhost', 1521, 'ORCL', 'user', 'pass')
 * const rows = await conn.exec('SELECT * FROM entity WHERE id = :1', [42])
 * await conn.disconnect()
 *
 * @note SQL parameters use positional bind syntax: :1, :2, :3, ... matching the params array by index.
 */
export async function connect(host: string, port: number, database: string, login: string, password: string): Promise<OraConnection> {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
    const connection = await oracledb.getConnection({
        user: login,
        password,
        connectString: `${host}:${port}/${database}`,
    })

    return {
        async exec(script: string, params?: any[]): Promise<any[]> {
            let trimmedParams: any[] = []
            if (params && params.length > 0) {
                const maxIdx = Math.max(0, ...[...script.matchAll(/:(\d+)/g)].map(m => parseInt(m[1]!)))
                trimmedParams = maxIdx > 0 ? params.slice(0, maxIdx) : []
            }
            const result = await connection.execute(script, trimmedParams)
            return (result.rows as any[]) ?? []
        },
        async disconnect(): Promise<void> {
            await connection.close()
        },
    }
}
