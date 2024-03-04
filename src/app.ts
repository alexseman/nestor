import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { Connection } from 'mysql2/promise';
import Controller from './utils/abstractions/controller.interface.js';
import logger, { LoggerStream } from './utils/logger.js';
import DatabaseConnection from './database/databaseConnection.js';
import errorMiddleware from './middleware/error.middleware.js';
import CacheHelper from './utils/cacheHelper.js';

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
                this.initializeCache();
                this.initializeErrorHandling();
            })
            .catch((err): void => {
                const errorString = `Error initializing DB connection - "${err.message}"`;
                logger.error(errorString);
                console.error(errorString);
            });
    }

    private initializeDatabaseConnection(): Promise<Connection> {
        return DatabaseConnection.getInstance();
    }

    private initializeMiddleware(): void {
        this.express.use(helmet());
        this.express.use(cors());
        this.express.use(morgan('combined', { stream: new LoggerStream() }));
        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: false }));
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

    private initializeCache(): void {
        CacheHelper.getInstance();
    }

    public listen(): void {
        this.express.listen(this.port, () => {
            logger.debug(`API listening on port ${this.port}`);
        });
    }
}

export default App;
