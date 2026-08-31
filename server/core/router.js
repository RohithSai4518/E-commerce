/**
 * Custom HTTP Router & Middleware Pipeline
 * 
 * Supports dynamic path parameters (:id, :slug), wildcard patterns,
 * nested sub-routers, sequential middleware execution, and centralized error handling.
 * Zero external dependencies.
 */

class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  /**
   * Register a global middleware
   * @param {Function} fn - (ctx, next) => Promise<void>
   */
  use(fn) {
    if (typeof fn === 'function') {
      this.middlewares.push(fn);
    } else if (fn instanceof Router) {
      // Sub-router integration
      this.routes.push({
        type: 'subrouter',
        prefix: fn.prefix || '',
        router: fn
      });
    }
    return this;
  }

  /**
   * Register a route handler
   */
  register(method, path, ...handlers) {
    const paramNames = [];
    const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    
    // Convert path to regex (e.g. /api/products/:id -> /api/products/([^/]+))
    const regexSource = normalizedPath.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    }).replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexSource}$`);

    this.routes.push({
      method: method.toUpperCase(),
      path: normalizedPath,
      regex,
      paramNames,
      handlers: handlers.filter(h => typeof h === 'function')
    });

    return this;
  }

  get(path, ...handlers) {
    return this.register('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    return this.register('POST', path, ...handlers);
  }

  put(path, ...handlers) {
    return this.register('PUT', path, ...handlers);
  }

  patch(path, ...handlers) {
    return this.register('PATCH', path, ...handlers);
  }

  delete(path, ...handlers) {
    return this.register('DELETE', path, ...handlers);
  }

  options(path, ...handlers) {
    return this.register('OPTIONS', path, ...handlers);
  }

  /**
   * Match incoming request and execute middleware chain
   */
  async handle(ctx) {
    const reqMethod = ctx.method.toUpperCase();
    const reqPath = ctx.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

    // Build execution pipeline
    const pipeline = [...this.middlewares];
    let matchedRoute = null;

    for (const route of this.routes) {
      if (route.method === reqMethod || route.method === 'ALL') {
        const match = reqPath.match(route.regex);
        if (match) {
          matchedRoute = route;
          // Extract dynamic route parameters
          ctx.params = {};
          route.paramNames.forEach((name, index) => {
            ctx.params[name] = decodeURIComponent(match[index + 1]);
          });
          pipeline.push(...route.handlers);
          break;
        }
      }
    }

    if (!matchedRoute && reqMethod !== 'OPTIONS') {
      return ctx.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: reqPath,
        method: reqMethod
      });
    }

    if (reqMethod === 'OPTIONS') {
      return ctx.status(204).end();
    }

    // Execute middleware and handler pipeline sequentially
    let index = 0;
    const next = async () => {
      if (index < pipeline.length) {
        const fn = pipeline[index++];
        await fn(ctx, next);
      }
    };

    try {
      await next();
    } catch (err) {
      console.error(`[Router Error] ${reqMethod} ${reqPath}:`, err);
      if (!ctx.res.writableEnded) {
        ctx.status(err.status || 500).json({
          success: false,
          error: err.message || 'Internal Server Error',
          code: err.code || 'SERVER_ERROR'
        });
      }
    }
  }
}

module.exports = Router;
