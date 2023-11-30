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

export const ccipLookup = async (
  callDatas: ReadonlyDeep<[Address, string[], Hex][]>
) => {
  const failures: boolean[] = Array.from(
    { length: callDatas.length },
    () => false
  );
  const responses = await Promise.all(
    callDatas.map(async ([wrappedSender, wrappedUrls, wrappedCallData], i) => {
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
            args: [[[e.status || 400, e.details]]],
          });
        }
        return encodeErrorResult({
          abi: errorAbi,
          errorName: "HttpError",
          args: [[[400, e instanceof BaseError ? e.details : "Unknown Error"]]],
        });
      }
    })
  );

  return [failures, responses] as const;
};
