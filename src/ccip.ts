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

type CcipRequestItem = [success: boolean, result: Hex];

const ccipRequestItemHandler = async ([
  wrappedSender,
  wrappedUrls,
  wrappedCallData,
]: [Address, readonly string[], Hex]): Promise<CcipRequestItem> => {
  try {
    const ccipResult = await ccipFetch({
      sender: wrappedSender,
      urls: wrappedUrls,
      data: wrappedCallData,
    });
    return [false, ccipResult];
  } catch (e) {
    if (e instanceof HttpRequestError) {
      return [
        true,
        encodeErrorResult({
          abi: errorAbi,
          errorName: "HttpError",
          args: [[[e.status || 500, e.details]]],
        }),
      ];
    }
    return [
      true,
      encodeErrorResult({
        abi: errorAbi,
        errorName: "HttpError",
        args: [[[500, e instanceof BaseError ? e.details : "Unknown Error"]]],
      }),
    ];
  }
};

export const ccipLookup = async (
  callDatas: ReadonlyDeep<[Address, string[], Hex][]>
) => {
  const ccipRequestCache: Map<string, Promise<CcipRequestItem>> = new Map();
  const responsePromises: Promise<CcipRequestItem>[] = [];

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

    const ccipRequest = ccipRequestItemHandler([
      wrappedSender,
      wrappedUrls,
      wrappedCallData,
    ]);
    ccipRequestCache.set(requestId, ccipRequest);
    responsePromises.push(ccipRequest);
  }

  const awaitedResponses = await Promise.all(responsePromises);

  return awaitedResponses.reduce(
    ([failures, responses], [failure, response], i) => {
      failures[i] = failure;
      responses[i] = response;
      return [failures, responses] as [failures: boolean[], responses: Hex[]];
    },
    [[], []] as [failures: boolean[], responses: Hex[]]
  );
};
