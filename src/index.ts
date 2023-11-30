import { createCors, error } from "itty-router";
import { parseAbi } from "viem";
import { ccipLookup } from "./ccip";
import { Server } from "./server";
import { Env } from "./types";

const { preflight, corsify } = createCors({
  origins: ["*"],
  methods: ["GET", "POST", "PATCH", "DELETE"],
});

let supportedSenders: string[] = [];

const server = new Server();
const abi = parseAbi([
  "function query((address,string[],bytes)[]) returns (bool[],bytes[])",
]);
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
      const res = await ccipLookup(callDatas);
      return res;
    },
  },
]);
const app = server.makeApp("/");

app.all("*", preflight);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    supportedSenders = env.SUPPORTED_SENDERS;
    return app
      .handle(request)
      .catch((e) => {
        console.error(e);
        return error(e);
      })
      .then(corsify);
  },
};
