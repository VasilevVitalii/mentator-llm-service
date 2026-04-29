import pg from 'pg'
const { Client } = pg

/**
 * @typedef {Object} PgConnection
 * @property {function(script: string, params?: any[]): Promise<any[]>} exec - Execute a SQL query. Returns an array of rows (empty array for non-SELECT queries).
 * @property {function(): Promise<void>} disconnect - Close the connection.
 */

/**
 * Open a connection to a PostgreSQL database.
 *
 * @param {string} host - Database server hostname or IP address.
 * @param {number} port - Database server port (typically 5432).
 * @param {string} database - Name of the database to connect to.
 * @param {string} login - Database user name.
 * @param {string} password - Database user password.
 * @returns {Promise<PgConnection>}
 *
 * @example
 * const conn = await pg.connect('localhost', 5432, 'mydb', 'user', 'pass')
 * const rows = await conn.exec('SELECT * FROM entity WHERE id = $1', [42])
 * await conn.disconnect()
 */
export async function connect(host, port, database, login, password) {
    const client = new Client({ host, port, database, user: login, password })
    await client.connect()

    return {
        /**
         * Execute a SQL query.
         *
         * @param {string} script - SQL query string. Use $1, $2, ... for parameters.
         * @param {any[]} [params] - Optional array of query parameter values.
         * @returns {Promise<any[]>} Array of result rows. Empty array for INSERT/UPDATE/DELETE.
         */
        async exec(script, params) {
            const result = await client.query(script, params)
            return result.rows
        },

        /**
         * Close the database connection.
         *
         * @returns {Promise<void>}
         */
        async disconnect() {
            await client.end()
        }
    }
}
