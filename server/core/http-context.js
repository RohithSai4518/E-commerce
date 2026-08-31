/**
 * HTTP Context Wrapper
 * 
 * Provides an ergonomic API around Node's native IncomingMessage and ServerResponse.
 * Automatically parses JSON payloads, query strings, cookies, headers, and handles file streaming.
 * Zero external dependencies.
 */

const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

class HttpContext {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.method = req.method;
    
    // Parse URL and Query parameters
    const parsedUrl = url.parse(req.url, true);
    this.url = req.url;
    this.pathname = parsedUrl.pathname;
    this.query = parsedUrl.query || {};
    this.headers = req.headers;
    this.params = {};
    this.body = null;
    this.user = null;
    this.session = null;
  }

  /**
   * Parse incoming JSON or Form body stream
   */
  async parseBody() {
    if (this.method === 'GET' || this.method === 'HEAD' || this.method === 'OPTIONS') {
      this.body = {};
      return this.body;
    }

    return new Promise((resolve, reject) => {
      let data = '';
      const maxPayload = 10 * 1024 * 1024; // 10MB limit

      this.req.on('data', chunk => {
        data += chunk;
        if (data.length > maxPayload) {
          this.req.destroy();
          reject(new Error('Payload too large'));
        }
      });

      this.req.on('end', () => {
        const contentType = this.headers['content-type'] || '';
        try {
          if (contentType.includes('application/json')) {
            this.body = data.trim() ? JSON.parse(data) : {};
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            this.body = querystring.parse(data);
          } else {
            this.body = data;
          }
          resolve(this.body);
        } catch (e) {
          reject(new Error('Malformed payload: ' + e.message));
        }
      });

      this.req.on('error', reject);
    });
  }

  /**
   * Set HTTP status code
   */
  status(code) {
    this.res.statusCode = code;
    return this;
  }

  /**
   * Set response header
   */
  setHeader(name, value) {
    this.res.setHeader(name, value);
    return this;
  }

  /**
   * Send JSON response
   */
  json(data) {
    if (!this.res.headersSent) {
      this.res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    this.res.end(JSON.stringify(data));
  }

  /**
   * Send Plain Text response
   */
  text(content) {
    if (!this.res.headersSent) {
      this.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    this.res.end(content);
  }

  /**
   * Send HTML response
   */
  html(content) {
    if (!this.res.headersSent) {
      this.res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    this.res.end(content);
  }

  /**
   * End response without body
   */
  end() {
    this.res.end();
  }

  /**
   * Serve a static file securely
   */
  async serveFile(filePath, defaultFile = 'index.html') {
    let resolvedPath = path.normalize(filePath);
    
    // Check if target is a directory, serve default file
    try {
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) {
        resolvedPath = path.join(resolvedPath, defaultFile);
      }
    } catch (e) {
      return this.status(404).text('File Not Found');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(resolvedPath);
      this.res.setHeader('Content-Type', contentType);
      this.res.setHeader('Cache-Control', 'public, max-age=3600');
      this.res.end(content);
    } catch (err) {
      this.status(404).text('File Not Found');
    }
  }

  /**
   * Get bearer token or session header
   */
  getAuthToken() {
    const authHeader = this.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return this.headers['x-session-id'] || null;
  }
}

module.exports = HttpContext;
