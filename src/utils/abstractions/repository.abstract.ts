import { Connection } from 'mysql2/promise';
import CacheHelper from '../cacheHelper.js';
import DatabaseConnection from '../../database/databaseConnection.js';
import logger from '../logger.js';

abstract class Repository {
    public static table: string;
    protected cache: CacheHelper;
    protected db: Connection;

    protected constructor() {
        this.cache = CacheHelper.getInstance();
        DatabaseConnection.getInstance().then((dbInstance: Connection) => {
            this.db = dbInstance;
        });
    }

    protected invalidateCache(key: string): void {
        if (key.endsWith(':*')) {
            CacheHelper.delPattern(key);
        }
        this.cache.del(key);
    }

    protected async performTransaction(
        transaction: () => void,
        cacheKey: null | string = null
    ) {
        try {
            await this.db.beginTransaction();
            await transaction();
            await this.db.commit();
            if (cacheKey) {
                this.invalidateCache(cacheKey);
            }
        } catch (e) {
            logger.error(`Transaction Error: ${e.message}`);
            await this.db.rollback();
            throw e;
        }
    }
}

export default Repository;
