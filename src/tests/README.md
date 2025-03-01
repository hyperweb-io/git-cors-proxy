# Tests for @isomorphic-git/cors-proxy

This directory contains tests for the CORS proxy server.

## Structure

```
tests/
├── cli/            # Tests for CLI functionality
├── middleware/     # Tests for middleware
├── utils/          # Tests for utility functions and test helpers
│   └── mock-fastify.ts  # Utility for creating mock Fastify instances
├── setup.ts        # Test setup file
└── index.test.ts   # Tests for the main server
```

## Running Tests

To run the tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run test:typecheck

# Run specific test files
npx vitest run src/tests/utils/allow-request.test.ts
```

## Test Coverage

The tests cover the following functionality:

1. **allow-request.ts**: Tests for the request filtering logic
   - Validates that only Git-specific requests are allowed
   - Tests all supported Git operations (info/refs, upload-pack, receive-pack)
   - Tests both regular requests and preflight OPTIONS requests

2. **proxy.ts**: Tests for the CORS proxy middleware
   - Validates proper URL parsing
   - Tests CORS headers configuration
   - Tests request filtering
   - Tests proxy functionality

3. **index.ts**: Tests for the server creation
   - Tests Fastify instance creation
   - Tests environment variable configuration
   - Tests logger configuration

## Test Utilities

### Mock Fastify

The `mock-fastify.ts` utility provides a factory function for creating mock Fastify instances that can be used in tests. This ensures that all tests use a consistent mock implementation and makes it easier to update the mock when needed.

Example usage:

```typescript
import { createMockFastifyInstance } from '../utils/mock-fastify';

describe('My Test', () => {
  const mockFastify = createMockFastifyInstance();
  
  it('should do something with Fastify', () => {
    // Use mockFastify in your test
  });
});
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create a new test file with the `.test.ts` extension
2. Use the same directory structure as the source code
3. Use descriptive test names
4. Mock external dependencies
5. Test both success and failure cases
6. Use the provided test utilities where appropriate 