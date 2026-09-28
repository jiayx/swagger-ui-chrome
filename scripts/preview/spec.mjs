// Local preview fixtures; never packaged into the extension.
export const spec = {
  openapi: '3.0.3',
  info: { title: 'Petstore API', version: '1.0.0', description: 'Everything you need to manage pets, orders, and customers. Explore an endpoint to view its parameters and try a request.' },
  servers: [{ url: 'https://petstore3.swagger.io/api/v3', description: 'Public sandbox' }],
  tags: [{ name: 'pet', description: 'Find and manage pets' }, { name: 'store', description: 'Orders and inventory' }, { name: 'user', description: 'Customer accounts' }],
  paths: {},
  components: { securitySchemes: { api_key: { type: 'apiKey', in: 'header', name: 'api_key' }, basicAuth: { type: 'http', scheme: 'basic' } } },
};
for (const [method, path, tag, summary] of [
  ['get', '/pet/findByStatus', 'pet', 'Find pets by status'],
  ['get', '/pet/{petId}', 'pet', 'Find a pet by ID'],
  ['post', '/pet', 'pet', 'Add a new pet'],
  ['put', '/pet', 'pet', 'Update an existing pet'],
  ['delete', '/pet/{petId}', 'pet', 'Delete a pet'],
  ['get', '/store/inventory', 'store', 'Get inventory by status'],
  ['post', '/store/order', 'store', 'Place an order'],
  ['get', '/user/{username}', 'user', 'Get a user by name'],
]) {
  const operation = { tags: [tag], summary, operationId: method + path.replaceAll('/', '_'), responses: { 200: { description: 'Successful response', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer', example: 10 }, name: { type: 'string', example: 'Milo' }, status: { type: 'string', example: 'available' } } } } } } } };
  if (path.includes('{')) operation.parameters = [{ name: path.split('{')[1].split('}')[0], in: 'path', required: true, schema: { type: 'string' }, description: 'The unique identifier' }];
  if (path.includes('findByStatus')) operation.parameters = [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'pending', 'sold'], default: 'available' } }];
  (spec.paths[path] ??= {})[method] = operation;
}
spec.paths['/__preview/basic-auth'] = { get: {
  tags: ['local-test'], summary: 'Verify Basic Auth locally (demo / demo)',
  servers: [{ url: '/' }], security: [{ basicAuth: [] }],
  responses: { 200: { description: 'Basic Auth accepted' }, 401: { description: 'Missing or incorrect demo credentials' } },
} };
