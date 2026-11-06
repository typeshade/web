export async function loadGraphModule(
  code: string,
  install: (url: string) => Promise<unknown>,
) {
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" }),
  );
  try {
    await install(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
