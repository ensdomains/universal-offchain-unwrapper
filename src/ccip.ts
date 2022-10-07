import { Interface } from "@ethersproject/abi";

const errorIface = new Interface(["error Error(tuple(uint16, string)[])"]);

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

  const errorMessages: Array<[number, string]> = [];

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
    }).then(async (res) => {
      const retJson = await res.json<object>().catch(() => {});
      return {
        ...retJson,
        status: res.status,
        statusText: res.statusText,
      } as {
        data: string | undefined;
        status: number;
        statusText: string | undefined;
      };
    });

    if (result.data) return result.data;

    const errorMessage = result.statusText || "unknown error";

    // 4xx indicates the result is not present; stop
    if (result.status >= 400 && result.status < 500) {
      throw errorIface.encodeErrorResult("Error", [
        [[result.status, errorMessage]],
      ]);
    }

    // 5xx indicates server issue; try the next url
    errorMessages.push([result.status, errorMessage]);
  }

  throw errorIface.encodeErrorResult("Error", [errorMessages]);
};

export const ccipLookup = async (callDatas: [string, string[], string][]) => {
  const failures: boolean[] = Array.from(
    { length: callDatas.length },
    () => false
  );
  const responses = await Promise.all(
    callDatas.map(async ([wrappedSender, wrappedUrls, wrappedCallData], i) => {
      try {
        const ccipResult = await ccipReadFetch(
          wrappedSender,
          wrappedCallData,
          wrappedUrls
        );
        if (ccipResult === null) {
          throw errorIface.encodeErrorResult("Error", [
            [[400, "No URLs provided"]],
          ]);
        }

        return ccipResult;
      } catch (e) {
        failures[i] = true;
        return e;
      }
    })
  );

  return [failures, responses];
};
