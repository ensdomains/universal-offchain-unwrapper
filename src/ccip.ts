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

export const ccipLookup = async (callDatas: [string, string[], string][]) => {
  const responses = await Promise.all(
    callDatas.map(async ([wrappedSender, wrappedUrls, wrappedCallData]) => {
      const ccipResult = await ccipReadFetch(
        wrappedSender,
        wrappedCallData,
        wrappedUrls
      );
      if (ccipResult === null) {
        throw new Error("CCIP Read provided no URLs");
      }

      return ccipResult;
    })
  );

  return responses;
};
