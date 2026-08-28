import { join } from 'path';
import { pathToFileURL } from 'url';

let quasarServer;

export default async function handler(req, res) {
  try {
    const indexPath = join(process.cwd(), 'dist', 'ssr', 'index.js');
    quasarServer = await import(pathToFileURL(indexPath).href); // no `const` here

    const render = quasarServer.handler;

    if (typeof render !== 'function') {
      if (quasarServer.app && typeof quasarServer.app === 'function') {
        return quasarServer.app(req, res);
      }
      throw new Error(`Handler is type ${typeof render}. App is type ${typeof quasarServer.app}`);
    }

    return render(req, res);
  } catch (error) {
    // Full detail goes to Vercel's server-side logs only.
    console.error('Vercel Execution Error:', error, {
      exports: Object.keys(quasarServer || {})
    });

    // Generic message to the client — no stack traces, file paths, or
    // internal module structure. Set VERCEL_ENV/NODE_ENV appropriately
    // if you ever want more detail in preview deployments specifically.
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
}