import { ChainableCommander, Redis, ScanStream } from 'ioredis';
import process from 'process';
import { RowDataPacket } from 'mysql2/promise';
import HttpException from './exceptions/http.exception.js';
import logger from './logger.js';

class CacheHelper extends Redis {
    private static instance: CacheHelper;
    private static BYPASS_CACHE: string = process.env.BYPASS_CACHE;
    private static TTL: number = 60 * 60 * 24;

    private constructor() {
        super();
    }

    static getInstance(): CacheHelper {
        if (this.instance) {
            return this.instance;
        }

        this.setConnection();
        return this.instance;
    }

    private static setConnection(): void {
        const { REDIS_HOST } = process.env;
        this.instance = new Redis({ host: REDIS_HOST });
    }

    static async setVal(key: string, value: any, ttl: number = this.TTL) {
        await this.instance.set(
            key,
            JSON.stringify(value, (k, v) => (v === undefined ? null : v)),
            'EX',
            ttl
        );
    }

    static async getVal(key: string) {
        try {
            const result: null | string = await this.instance.get(
                key,
                (e, r) => {
                    logger.debug(`CACHE ${!!r ? 'HIT' : 'MISS'} %${key}%`);
                }
            );
            return JSON.parse(result);
        } catch (e) {
            throw new HttpException(
                500,
                `Cache Get Error For Key "${key}": ${e.message}`
            );
        }
    }

    static async getOrSet(
        key: string,
        fetcher: () => Promise<RowDataPacket[] | [] | object>,
        ttl: number = this.TTL
    ): Promise<RowDataPacket[] | [] | object> {
        if (this.BYPASS_CACHE === 'true') {
            return fetcher();
        }

        const res = await this.getVal(key);
        if (res) {
            return res;
        }

        const fetchRes = await fetcher();
        await this.setVal(key, fetchRes, ttl);

        return fetchRes;
    }

    static delPattern(pattern: string): void {
        const stream: ScanStream = this.instance.scanStream({
            match: pattern,
        });

        stream.on('data', (keys) => {
            if (!keys.length) {
                return;
            }

            const pipeline: ChainableCommander = this.instance.pipeline();
            keys.forEach((key: string) => {
                pipeline.del(key);
            });

            pipeline.exec();
        });
    }
}

export default CacheHelper;
