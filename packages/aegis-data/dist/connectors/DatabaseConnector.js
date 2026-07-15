export class DatabaseConnector {
    id;
    type = 'Database';
    connected = false;
    dbType = 'SQLite';
    approvedTables = [];
    connectionString = '';
    constructor(id) {
        this.id = id;
    }
    async connect(config) {
        if (!config.approvedTables || config.approvedTables.length === 0) {
            throw new Error('Approved tables list is empty. Explicit table approval is required.');
        }
        this.dbType = config.type;
        this.approvedTables = config.approvedTables;
        this.connectionString = config.connectionString || '';
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
    }
    async collect() {
        if (!this.connected)
            throw new Error('Connector is not connected');
        const samples = [];
        if (this.dbType === 'SQLite') {
            // Direct file DB or mock file DB simulation
            for (const table of this.approvedTables) {
                samples.push({
                    id: `db-sqlite-${table}-row1`,
                    content: `Simulated medical row data from SQLite table ${table}. Diagnosed condition is cleared.`,
                    metadata: { table, dbType: 'SQLite', rowId: 'row1' }
                });
            }
        }
        else {
            // MySQL / PostgreSQL / MongoDB mock collection
            for (const table of this.approvedTables) {
                samples.push({
                    id: `db-remote-${table}-row1`,
                    content: `Simulated row data from remote database type ${this.dbType}, table ${table}. ID MRN-99881.`,
                    metadata: { table, dbType: this.dbType, rowId: 'row1' }
                });
            }
        }
        return samples;
    }
    async validate() {
        return this.connected && this.approvedTables.length > 0;
    }
    async watch(onChange) { }
    async metadata() {
        return {
            connected: this.connected,
            dbType: this.dbType,
            approvedTables: this.approvedTables
        };
    }
    async statistics() {
        return {
            dbType: this.dbType,
            approvedTablesCount: this.approvedTables.length
        };
    }
}
