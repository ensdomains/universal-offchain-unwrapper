import { Fragment, FunctionFragment, Interface, JsonFragment, Result } from '@ethersproject/abi';
import { BytesLike } from '@ethersproject/bytes';
import { Router } from 'itty-router';
import { IRequest } from './utils/cors';
export interface RPCCall {
    to: BytesLike;
    data: BytesLike;
}
export interface RPCResponse {
    status: number;
    body: any;
}
export declare type HandlerFunc = (args: Result, req: RPCCall) => Promise<Array<any>> | Array<any>;
interface Handler {
    type: FunctionFragment;
    func: HandlerFunc;
}
export interface HandlerDescription {
    type: string;
    func: HandlerFunc;
}
/**
 * Implements a Durin gateway service using itty-router.js.
 *
 * Example usage:
 * ```javascript
 * const ccipread = require('@chainlink/ccip-read-cf-worker');
 * const server = new ccipread.Server();
 * const abi = [
 *   'function getSignedBalance(address addr) public view returns(uint256 balance, bytes memory sig)',
 * ];
 * server.add(abi, [
 *   {
 *     type: 'getSignedBalance',
 *     func: async (contractAddress, [addr]) => {
 *       const balance = getBalance(addr);
 *       const sig = signMessage([addr, balance]);
 *       return [balance, sig];
 *     }
 *   }
 * ]);
 * const app = server.makeApp();
 * module.exports = {
 *  fetch: function (request, _env, _context) {
 *    return app.handle(request)
 *  }
 * };
 * ```
 */
export declare class Server {
    /** @ignore */
    readonly handlers: {
        [selector: string]: Handler;
    };
    /**
     * Constructs a new Durin gateway server instance.
     */
    constructor();
    /**
     * Adds an interface to the gateway server, with handlers to handle some or all of its functions.
     * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
     *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
     * @param handlers An array of handlers to register against this interface.
     */
    add(abi: string | readonly (string | Fragment | JsonFragment)[] | Interface, handlers: Array<HandlerDescription>): void;
    /**
     * Convenience function to construct an `itty-router` application object for the gateway.
     * Example usage:
     * ```javascript
     * const ccipread = require('@chainlink/ccip-read-cf-worker');
     * const server = new ccipread.Server();
     * // set up server object here
     * const app = server.makeApp('/');
     * module.exports = {
     *  fetch: function (request, _env, _context) {
     *    return app.handle(request)
     *  }
     * };
     * ```
     * The path prefix to `makeApp` will have sender and callData arguments appended.
     * If your server is on example.com and configured as above, the URL template to use
     * in a smart contract would be "https://example.com/{sender}/{callData}.json".
     * @returns An `itty-router.Router` object configured to serve as a CCIP read gateway.
     */
    makeApp(prefix: string): Router;
    handleRequest(req: IRequest): Promise<Response>;
    call(call: RPCCall): Promise<RPCResponse>;
}
export {};
