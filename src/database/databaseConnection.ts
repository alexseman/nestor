import mysql, { Connection } from 'mysql2/promise';
import * as process from 'process';

class DatabaseConnection {
    private static instance: Promise<Connection>;

    private constructor() {}

    static getInstance(): Promise<Connection> {
        if (this.instance) {
            return this.instance;
        }

        this.setConnection();
        return this.instance;
    }

    static async getInstanceAsync(): Promise<Connection> {
        return await this.getInstance();
    }

    private static setConnection(): void {
        this.instance = mysql.createConnection(this.getConfig());
    }

    private static getConfig(): object {
        const { DB_HOST, DB_USER, DB_DATABASE, DB_PASSWORD } = process.env;
        return {
            host: DB_HOST,
            user: DB_USER,
            database: DB_DATABASE,
            password: DB_PASSWORD,
        };
    }
}

export default DatabaseConnection;
