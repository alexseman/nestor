import express, {Application} from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import {Connection} from 'mysql2/promise';

import Controller from '@/utils/abstractions/controller.interface';
import errorMiddleware from '@/middleware/error.middleware';
import DatabaseConnection from "@/database/databaseConnection";

class App {
    public express: Application;
    public port: number;

    constructor(controllers: Controller[], port: number) {
        this.express = express();
        this.port = port;

        this.initializeDatabaseConnection()
            .then((): void => {
                this.initializeMiddleware();
                this.initializeControllers(controllers);
                this.initializeErrorHandling();
            }).catch((err): void => {
            console.error(`Error initializing DB connection - "${err.message}"`)
        });
    }

    private initializeDatabaseConnection(): Promise<Connection> {
        return DatabaseConnection.getInstance();
    }

    private initializeMiddleware(): void {
        this.express.use(helmet());
        this.express.use(cors());
        this.express.use(morgan('dev'));
        this.express.use(express.json());
        this.express.use(express.urlencoded({extended: false}));
        this.express.use(compression());
    }

    private initializeControllers(controllers: Controller[]): void {
        controllers.forEach((controller: Controller) => {
            this.express.use('/api', controller.router);
        });
    }

    private initializeErrorHandling(): void {
        this.express.use(errorMiddleware);
    }

    public listen(): void {
        this.express.listen(this.port, () => {
            console.log(`API listening on port ${this.port}`);
        });
    }
}

export default App;
