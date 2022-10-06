export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const makeResponse = (
  body?: BodyInit | null | object,
  {
    status,
    headers,
  }: {
    status?: number;
    headers?: Record<string, any>;
  } = {}
) => {
  let data: BodyInit | null = null;
  if (body) {
    if (typeof body === "object") {
      data = JSON.stringify(body);
    } else if (typeof body === "string") {
      data = JSON.stringify({ message: body });
    } else {
      data = body;
    }
  }

  return new Response(data, {
    status,
    headers: {
      ...corsHeaders,
      ...(headers || {}),
    },
  });
};
