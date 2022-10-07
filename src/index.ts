import { Server } from "@chainlink/ccip-read-cf-worker/src";
import { ccipLookup } from "./ccip";
import { Env } from "./types";

let supportedSenders: string[] = [];

const server = new Server();
const abi = [
  "function query(tuple(address,string[],bytes)[]) returns (bool[],bytes[])",
];
server.add(abi, [
  {
    type: "query",
    func: async ([callDatas], { to: sender }) => {
      if (
        supportedSenders.length > 0 &&
        !supportedSenders.includes(sender as string)
      ) {
        throw new Error("Sender not supported");
      }
      const res = await ccipLookup(callDatas as [string, string[], string][]);
      return res;
    },
  },
]);
const app = server.makeApp("/");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    supportedSenders = env.SUPPORTED_SENDERS;
    return app.handle(request).catch((e) => console.error(e));
  },
};
