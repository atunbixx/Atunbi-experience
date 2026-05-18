// Minimal ambient types for Cloudflare Pages Functions — avoids adding a
// dependency (@cloudflare/workers-types) just for the contact endpoint.
// The real types are provided by the Cloudflare runtime at deploy.

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

type PagesFunction<Env = unknown> = (ctx: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;
