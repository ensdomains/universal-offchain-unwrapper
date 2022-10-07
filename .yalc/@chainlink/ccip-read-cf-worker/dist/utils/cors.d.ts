import { Route } from 'itty-router';
declare type MethodType = 'GET' | 'POST';
export declare type InputCORSOptions = {
    origin?: string;
    maxAge?: number;
    allowCredentials?: boolean;
};
declare type ExtendedCORS = InputCORSOptions & {
    methods?: string;
    headers?: string;
};
export interface IRequest extends Request {
    params: any;
    method: MethodType;
    url: string;
    optional?: string;
}
export interface IMethods {
    get: Route;
    post: Route;
}
export declare const handleCors: (options?: ExtendedCORS) => (request: IRequest) => Response;
export declare const withCors: (response: Response, options?: any) => Response;
export {};
