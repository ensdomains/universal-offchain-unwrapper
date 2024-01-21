import type {
  Abi,
  AbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiFunctionNames,
} from "abitype";
import { IRequest, RouteHandler, Router, RouterType } from "itty-router";
import {
  Address,
  Hex,
  InferItemName,
  decodeFunctionData,
  encodeFunctionResult,
  getAbiItem,
  getFunctionSelector,
  isAddress,
  isHex,
} from "viem";

export interface RPCCall {
  to: Address;
  data: Hex;
}

export interface RPCResponse {
  status: number;
  body: any;
}

export type HandlerFunc<abiFunc extends AbiFunction> = (
  args: AbiParametersToPrimitiveTypes<abiFunc["inputs"]>,
  req: RPCCall
) =>
  | Promise<AbiParametersToPrimitiveTypes<abiFunc["outputs"]>>
  | AbiParametersToPrimitiveTypes<abiFunc["outputs"]>;

type Handler<abiFunc extends AbiFunction> = {
  type: abiFunc;
  func: HandlerFunc<abiFunc>;
};

export type HandlerDescription<
  abi extends Abi,
  functionName extends ExtractAbiFunctionNames<abi> = ExtractAbiFunctionNames<abi>
> = {
  type: functionName | ExtractAbiFunctionNames<abi>;
  func: HandlerFunc<ExtractAbiFunction<abi, functionName>>;
};

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
export class Server {
  /** @ignore */
  readonly handlers: { [selector: string]: Handler<AbiFunction> };

  /**
   * Constructs a new Durin gateway server instance.
   */
  constructor() {
    this.handlers = {};
  }

  /**
   * Adds an interface to the gateway server, with handlers to handle some or all of its functions.
   * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
   *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
   * @param handlers An array of handlers to register against this interface.
   */
  add<const abi extends Abi>(
    abi: abi,
    handlers: Array<HandlerDescription<abi>>
  ) {
    for (const handler of handlers) {
      const fn = getAbiItem({
        abi: abi as Abi,
        name: handler.type as InferItemName<abi>,
      }) as AbiFunction;
      this.handlers[getFunctionSelector(fn)] = {
        type: fn,
        func: handler.func as HandlerFunc<AbiFunction>,
      };
    }
  }

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
  makeApp(prefix: string, preflight?: RouteHandler): RouterType {
    const app = Router();
    if (preflight) {
      app.all("*", preflight);
    }
    app.get(prefix, () => new Response("hey ho!", { status: 200 }));
    app.get(`${prefix}:sender/:callData`, this.handleRequest.bind(this));
    app.post(prefix, this.handleRequest.bind(this));
    return app;
  }

  async handleRequest(req: IRequest) {
    let sender: string | undefined;
    let callData: string | undefined;

    if (req.method === "GET") {
      sender = req.params.sender;
      callData = req.params.callData;
    } else {
      const body = await req.json<{ sender?: string; data?: string }>();
      sender = body.sender;
      callData = body.data;
    }

    if (!sender || !callData || !isAddress(sender) || !isHex(callData)) {
      return new Response("Invalid request format", { status: 400 });
    }

    try {
      const response = await this.call({ to: sender, data: callData });
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          data: {
            error: `Internal server error: ${(e as any).toString()}`,
          },
        }),
        {
          status: 500,
        }
      );
    }
  }

  async call(call: RPCCall): Promise<RPCResponse> {
    const calldata = call.data;
    const selector = calldata.slice(0, 10).toLowerCase();

    // Find a function handler for this selector
    const handler = this.handlers[selector];
    if (handler === undefined) {
      return {
        status: 404,
        body: {
          data: {
            error: `No implementation for function with selector ${selector}`,
          },
        },
      };
    }

    // Decode function arguments
    const { args } = decodeFunctionData({
      abi: [handler.type],
      data: calldata,
    });

    // Call the handler
    const result = await handler.func(args!, call);

    // Encode return data
    return {
      status: 200,
      body: {
        data: handler.type.outputs
          ? encodeFunctionResult({ abi: [handler.type], result })
          : "0x",
      },
    };
  }
}
