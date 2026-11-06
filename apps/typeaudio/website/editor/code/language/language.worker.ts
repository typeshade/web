import { TypeShadeSession } from "./TypeShadeSession.ts";
import type { LanguageRequest, LanguageReply } from "./types.ts";

const session = new TypeShadeSession();
self.onmessage = ({
  data,
}: MessageEvent<LanguageRequest | { close: string }>) => {
  if ("close" in data) {
    session.close(data.close);
    return;
  }
  const reply: LanguageReply = {
    id: data.id,
    uri: data.document.uri,
    version: data.document.version,
  };
  try {
    reply.result = session.query(data);
  } catch (error) {
    reply.error = error instanceof Error ? error.message : String(error);
  }
  self.postMessage(reply);
};
