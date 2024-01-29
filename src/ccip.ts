import {
  Address,
  BaseError,
  Hex,
  HttpRequestError,
  ccipFetch,
  encodeErrorResult,
  parseAbi,
} from "viem";

type ReadonlyDeep<T> = {
  readonly [P in keyof T]: ReadonlyDeep<T[P]>;
};

const errorAbi = parseAbi(["error HttpError((uint16, string)[])"]);

const createCcipRequestItemHandler =
  (failures: boolean[]) =>
  async (
    [wrappedSender, wrappedUrls, wrappedCallData]: [
      Address,
      readonly string[],
      Hex
    ],
    i: number
  ) => {
    try {
      const ccipResult = await ccipFetch({
        sender: wrappedSender,
        urls: wrappedUrls,
        data: wrappedCallData,
      });
      return ccipResult;
    } catch (e) {
      failures[i] = true;
      if (e instanceof HttpRequestError) {
        return encodeErrorResult({
          abi: errorAbi,
          errorName: "HttpError",
          args: [[[e.status || 500, e.details]]],
        });
      }
      return encodeErrorResult({
        abi: errorAbi,
        errorName: "HttpError",
        args: [[[500, e instanceof BaseError ? e.details : "Unknown Error"]]],
      });
    }
  };

export const ccipLookup = async (
  callDatas: ReadonlyDeep<[Address, string[], Hex][]>
) => {
  const failures: boolean[] = Array.from(
    { length: callDatas.length },
    () => false
  );
  const ccipRequestCache: Map<string, Promise<Hex>> = new Map();
  const ccipRequestItemHandler = createCcipRequestItemHandler(failures);
  const responsePromises: Promise<Hex>[] = [];

  for (let i = 0; i < callDatas.length; i += 1) {
    const [wrappedSender, wrappedUrls, wrappedCallData] = callDatas[i];
    const requestId = JSON.stringify([
      wrappedSender,
      wrappedUrls,
      wrappedCallData,
    ]);

    const existingRequest = ccipRequestCache.get(requestId);
    if (existingRequest) {
      responsePromises.push(existingRequest);
      continue;
    }

    const ccipRequest = ccipRequestItemHandler(
      [wrappedSender, wrappedUrls, wrappedCallData],
      i
    );
    ccipRequestCache.set(requestId, ccipRequest);
    responsePromises.push(ccipRequest);
  }

  const responses = await Promise.all(responsePromises);

  return [failures, responses] as const;
};
