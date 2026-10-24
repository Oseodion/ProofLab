export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function readJsonBody(
  request: Request,
  maxChars: number,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; message: string }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, message: "Could not read the request body." };
  }

  if (text.length > maxChars) {
    return {
      ok: false,
      status: 413,
      message: `Request body exceeds ${maxChars} characters.`,
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, message: "Request body must be JSON." };
  }
}
