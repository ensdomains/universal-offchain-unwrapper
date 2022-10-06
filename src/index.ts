import { isAddress } from "@ethersproject/address";
import { isBytesLike } from "@ethersproject/bytes";
import { ccipLookup } from "./ccip";
import { makeResponse } from "./helpers";
import { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const senders = env.SUPPORTED_SENDERS;
    const url = new URL(request.url);

    const sender = url.pathname.split("/")[1];
    const callData = url.pathname.split("/")[2];

    if (!isAddress(sender) || !isBytesLike(callData)) {
      return makeResponse("Invalid request format", { status: 400 });
    }

    if (senders.length > 0 && !senders.includes(sender)) {
      return makeResponse("Sender not supported", { status: 400 });
    }

    try {
      const lookupResult = await ccipLookup(callData);
      return makeResponse({ data: lookupResult }, { status: 200 });
    } catch (e: any) {
      console.log("THROWING ERROR", e.message);
      return makeResponse(e.message, { status: 400 });
    }
  },
};
