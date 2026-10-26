// Playwright, with the module and the browser binary nameable by environment variable. The
// capture scripts run on a workstation, where both may sit outside the project;
// scripts/check-playground.mjs runs in the build, where the installed package and its own
// browser are found without help.
export async function launchChromium() {
  const modulePath = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
  let chromium;
  try {
    ({ chromium } = await import(modulePath));
  } catch (cause) {
    throw new Error(
      `[capture] cannot import '${modulePath}'. Point PLAYWRIGHT_MODULE at a Playwright ` +
        `installation (its index.mjs), and PLAYWRIGHT_CHROMIUM at the browser binary.`,
      { cause },
    );
  }
  // A network that reaches the outside through a proxy needs the browser told: it reads no
  // HTTPS_PROXY of its own. Loopback is where dist/ is served from, so it skips the proxy.
  const proxy = process.env.PLAYWRIGHT_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy;
  return chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
    proxy: proxy ? { server: proxy, bypass: '127.0.0.1,localhost,::1' } : undefined,
    // WebGPU on SwiftShader needs all of these.
    args: [
      '--enable-unsafe-webgpu',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--use-vulkan=swiftshader',
      '--enable-features=Vulkan',
    ],
  });
}
