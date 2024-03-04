import { Response } from 'express';

class ApiResponse {
    static respond(res: Response, status: number, output: string | object) {
        const isOk: boolean = ApiResponse.isResponseOk(status);
        const body: object = ApiResponse.responseBody(isOk, output);

        res.status(status).json({
            success: isOk,
            ...body,
        });
    }

    static isResponseOk(status: number): boolean {
        return [2, 3].indexOf(Number(String(status)[0])) !== -1;
    }

    static responseBody(ok: boolean, output: string | object): object {
        return typeof output === 'object'
            ? ok
                ? { data: Array.isArray(output) ? output : { ...output } }
                : { error: { ...output } }
            : ok
              ? { message: output }
              : { error: output };
    }
}

export default ApiResponse;
