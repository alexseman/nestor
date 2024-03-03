import {cleanEnv, port, str} from 'envalid';
import * as process from "process";

function validateEnv(): void {
    cleanEnv(process.env, {
        NODE_ENV: str({
            choices: ['development', 'production']
        }),
        PORT: port({
            default: 5000
        }),
        DB_HOST: str(),
        DB_USER: str(),
        DB_DATABASE: str(),
        DB_PASSWORD: str(),
        PATH_LOG: str(),
    });
}

export default validateEnv;