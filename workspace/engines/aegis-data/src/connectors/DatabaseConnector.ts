import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export class DatabaseConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'Database';
  private connected = false;
  private dbType: 'SQLite' | 'MySQL' | 'PostgreSQL' | 'MongoDB' = 'SQLite';
  private approvedTables: string[] = [];
  private connectionString = '';

  constructor(id: string) {
    this.id = id;
  }

  async connect(config: {
    type: 'SQLite' | 'MySQL' | 'PostgreSQL' | 'MongoDB';
    connectionString?: string;
    approvedTables: string[];
  }): Promise<void> {
    if (!config.approvedTables || config.approvedTables.length === 0) {
      throw new Error('Approved tables list is empty. Explicit table approval is required.');
    }
    this.dbType = config.type;
    this.approvedTables = config.approvedTables;
    this.connectionString = config.connectionString || '';
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');

    const samples: RawSample[] = [];

    if (this.dbType === 'SQLite') {
      // Direct file DB or mock file DB simulation
      for (const table of this.approvedTables) {
        samples.push({
          id: `db-sqlite-${table}-row1`,
          content: `Simulated medical row data from SQLite table ${table}. Diagnosed condition is cleared.`,
          metadata: { table, dbType: 'SQLite', rowId: 'row1' }
        });
      }
    } else {
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

  async validate(): Promise<boolean> {
    return this.connected && this.approvedTables.length > 0;
  }

  async watch(onChange: (event: any) => void): Promise<void> {}

  async metadata(): Promise<Record<string, any>> {
    return {
      connected: this.connected,
      dbType: this.dbType,
      approvedTables: this.approvedTables
    };
  }

  async statistics(): Promise<Record<string, any>> {
    return {
      dbType: this.dbType,
      approvedTablesCount: this.approvedTables.length
    };
  }
}
