import { defaultAbiCoder, Interface } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { hexDataSlice } from "@ethersproject/bytes";
import { toUtf8String } from "@ethersproject/strings";

function bytesPad(value: Uint8Array): Uint8Array {
  if (value.length % 32 === 0) {
    return value;
  }

  const result = new Uint8Array(Math.ceil(value.length / 32) * 32);
  result.set(value);
  return result;
}

function _parseBytes(result: string, start: number): null | string {
  if (result === "0x") {
    return null;
  }

  const offset = BigNumber.from(
    hexDataSlice(result, start, start + 32)
  ).toNumber();
  const length = BigNumber.from(
    hexDataSlice(result, offset, offset + 32)
  ).toNumber();

  return hexDataSlice(result, offset + 32, offset + 32 + length);
}

function _parseString(result: string, start: number): null | string {
  try {
    const parsed = _parseBytes(result, start);
    if (!parsed) return null;
    return toUtf8String(parsed);
  } catch (error) {}
  return null;
}

const ccipReadFetch = async (
  _sender: string,
  calldata: string,
  urls: Array<string>
): Promise<null | string> => {
  if (urls.length === 0) {
    return null;
  }

  const sender = _sender.toLowerCase();
  const data = calldata.toLowerCase();

  const errorMessages: Array<string> = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // URL expansion
    const href = url.replace("{sender}", sender).replace("{data}", data);

    // If no {data} is present, use POST; otherwise GET
    const json: string | null =
      url.indexOf("{data}") >= 0 ? null : JSON.stringify({ data, sender });

    const result = await fetch(href, {
      method: json ? "POST" : "GET",
      headers: json ? { "Content-Type": "application/json" } : {},
      body: json,
    }).then(
      async (res) =>
        ({
          ...(await res.json()),
          status: res.status,
          statusText: res.statusText,
        } as {
          data: string | undefined;
          status: number;
          statusText: string | undefined;
        })
    );

    if (result.data) return result.data;

    const errorMessage = result.statusText || "unknown error";

    // 4xx indicates the result is not present; stop
    if (result.status >= 400 && result.status < 500) {
      throw new Error(`response not found during CCIP fetch: ${errorMessage}`);
    }

    // 5xx indicates server issue; try the next url
    errorMessages.push(errorMessage);
  }

  throw new Error(
    `error encountered during CCIP fetch: ${errorMessages
      .map((m) => JSON.stringify(m))
      .join(", ")}`
  );
};

const iface = new Interface([
  "function query(tuple(address,string[],bytes)[]) returns (bytes[])",
]);

export const ccipLookup = async (callData: string) => {
  const [callDatas] = iface.decodeFunctionData("query", callData);
  const responses = await Promise.all(
    callDatas.map(
      async ([wrappedSender, wrappedUrls, wrappedCallData]: [
        string,
        string[],
        string
      ]) => {
        const ccipResult = await ccipReadFetch(
          wrappedSender,
          wrappedCallData,
          wrappedUrls
        );
        if (ccipResult === null) {
          throw new Error("CCIP Read provided no URLs");
        }
        return ccipResult;
      }
    )
  );

  return defaultAbiCoder.encode(["bytes[]"], [responses]);
};
