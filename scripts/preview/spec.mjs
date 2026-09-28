// Served by the local preview; all requests stay on localhost.
export const spec = {
  openapi: '3.0.3',
  info: { title: 'Local preview API', version: '1.0.0' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { basicAuth: { type: 'http', scheme: 'basic' } } },
  paths: {
    '/__preview/basic-auth': {
      get: {
        tags: ['local-test'], summary: 'Verify Basic Auth (demo / demo)',
        security: [{ basicAuth: [] }],
        responses: {
          200: { description: 'Basic Auth accepted' },
          401: { description: 'Missing or incorrect credentials' }
        }
      }
    }
  }
};
