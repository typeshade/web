export function compilerPin(pkg) {
  const value = pkg.devDependencies?.typeshade;
  if (
    typeof value !== "string" ||
    !/^https:\/\/github\.com\/typeshade\/typeshade\/archive\/[a-f0-9]{40}\.tar\.gz$/.test(
      value,
    )
  )
    throw new Error(
      "TypeShade must use a full commit in its source archive URL.",
    );
  return value;
}

export function verifyCompilerPair(engine, site) {
  if (compilerPin(engine) !== compilerPin(site))
    throw new Error(
      "TypeAudio and its website must pin the same TypeShade compiler. Promote the version pair together.",
    );
}
