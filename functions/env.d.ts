// Pages bundles a .wasm import as a precompiled WebAssembly.Module.
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

interface Env {
  /** Pages secret. Without it the API falls back to public GitHub endpoints (no contributed-to). */
  GITHUB_TOKEN?: string;
  /** Private repos count on the site owner's card only (the login in profile.json); "false" turns that off. */
  GITHUB_PRIVATE?: string;
  /** KV namespace for saved card scripts (short links). Optional. */
  CARDS?: KVNamespace;
}
