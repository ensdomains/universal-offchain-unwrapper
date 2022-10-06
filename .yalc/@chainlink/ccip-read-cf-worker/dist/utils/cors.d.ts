import { Route } from 'itty-router';
declare type MethodType = 'GET' | 'POST';
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
export declare const handleCors: (options?: any) => (request: IRequest) => Response;
export declare const wrapCorsHeader: (response: Response, options?: any) => Response;
export {};
