// Pages bundles a .wasm import as a precompiled WebAssembly.Module.
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

interface Env {
  /** Pages secret. Without it the API falls back to public GitHub endpoints (no contributed-to). */
  GITHUB_TOKEN?: string;
  /** "false" keeps private repos out of the totals even when the token can see them. */
  GITHUB_PRIVATE?: string;
  /** KV namespace for saved card scripts (short links). Optional. */
  CARDS?: KVNamespace;
}
