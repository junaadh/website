// Pages bundles a .wasm import as a precompiled WebAssembly.Module.
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

interface Env {
  /** Pages secret. Without it the API falls back to GitHub's REST API with fewer fields. */
  GITHUB_TOKEN?: string;
  /** KV namespace for saved card scripts (short links). Optional. */
  CARDS?: KVNamespace;
}
