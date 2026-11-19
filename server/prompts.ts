import type { ArtifactType, GenerationOptions, ParsedSpecSummary } from '../src/types/index.ts';

export interface PromptPayload {
  systemInstruction: string;
  prompt: string;
}

export function buildArtifactPrompt(
  artifact: ArtifactType,
  summary: ParsedSpecSummary,
  options: GenerationOptions,
): PromptPayload {
  // Trim extremely large specs gracefully while keeping all paths & schemas
  const maxSpecChars = 48000;
  const specText =
    summary.normalizedSpec.length > maxSpecChars
      ? `${summary.normalizedSpec.slice(0, maxSpecChars)}\n/* Truncated for context window */`
      : summary.normalizedSpec;

  const specHeader = `API Title: ${summary.title}
API Version: ${summary.version}
Base URL: ${summary.baseUrl}
Endpoints (${summary.endpointCount}):
${summary.endpoints.map((e) => `- ${e.method} ${e.path} (${e.operationId})`).join('\n')}

Dereferenced OpenAPI Specification:
${specText}`;

  switch (artifact) {
    case 'sdk': {
      const transport =
        options.sdkStyle === 'axios'
          ? 'Use axios (`import axios, { AxiosInstance } from "axios";`) inside a clean client class.'
          : 'Use the native `fetch` API with zero external runtime dependencies.';
      return {
        systemInstruction:
          'You are a principal TypeScript SDK architect. Output ONLY valid, runnable TypeScript code with no markdown fences, no commentary, and no prose before or after the code.',
        prompt: `Generate a complete, production-ready TypeScript client SDK for this OpenAPI specification.

Requirements:
1. ${transport}
2. Export all request, response, parameter, and schema TypeScript interfaces/types derived directly from the OpenAPI schemas.
3. Export a primary client class (derived from the API title, e.g. \`MeridianLedgerClient\`) accepting \`{ baseUrl?: string; token?: string; headers?: Record<string, string> }\` in its constructor, plus clean exported standalone helper types.
4. Implement one strongly typed async method per endpoint (using \`operationId\` in camelCase), handling path parameter interpolation, query string serialization, JSON request bodies, Authorization bearer headers, and typed \`ApiClientError\` errors for non-2xx responses.
5. Add concise JSDoc comments on the client class and each method.
6. Output ONLY raw TypeScript code (no \`\`\`ts fences).

${specHeader}`,
      };
    }

    case 'docs': {
      return {
        systemInstruction:
          'You are a senior developer documentation engineer. Output clean, well-structured GitHub-flavored Markdown API documentation directly with no conversational intro or outro.',
        prompt: `Generate comprehensive Markdown API documentation for this OpenAPI specification.

Requirements:
1. Start with \`# ${summary.title}\`, version, base URL, and authentication overview.
2. Include a concise Endpoints Index table (Method | Path | Operation | Summary).
3. Group endpoint sections by tag. For every endpoint, document:
   - HTTP Method & Path
   - Path, Query, and Header parameters in a clean Markdown table (Name | In | Type | Required | Description)
   - Request body schema & realistic JSON example (if applicable)
   - Response status codes with realistic JSON response payloads
4. Include a Data Models / Schemas reference section at the bottom.
5. Output clean Markdown ready to save as \`README.md\` or \`api-docs.md\`.

${specHeader}`,
      };
    }

    case 'tests': {
      const framework =
        options.testFramework === 'jest'
          ? 'Jest (`describe`, `it`, `expect`, `jest.fn()`)'
          : 'Vitest (`import { describe, it, expect, vi, beforeEach } from "vitest";`)';
      return {
        systemInstruction:
          'You are a staff QA & TypeScript test engineer. Output ONLY valid TypeScript test code with no markdown fences and no surrounding commentary.',
        prompt: `Generate a complete unit test suite using ${framework} for the API endpoints defined in this OpenAPI specification.

Requirements:
1. Mock global \`fetch\` cleanly before each test and reset mocks between tests.
2. Include a lightweight inline test client helper or import pattern so the test file is self-contained and immediately runnable.
3. For EVERY endpoint in the specification, write at least TWO tests:
   - A success path test verifying HTTP method, URL/query string, headers, request body serialization, and parsed response payload.
   - An error path test (e.g. 400, 404, 409, or 422) verifying structured error handling.
4. Use realistic typed mock fixtures matching the OpenAPI schemas.
5. Output ONLY raw TypeScript code (no \`\`\`ts fences).

${specHeader}`,
      };
    }

    case 'postman': {
      return {
        systemInstruction:
          'You are an API platform engineer. Output ONLY a single valid, strictly formatted Postman Collection v2.1.0 JSON object. Do not wrap in markdown code fences and do not include any text outside the JSON object.',
        prompt: `Generate a valid Postman Collection v2.1.0 JSON file for this OpenAPI specification.

Requirements:
1. Top-level \`info\` object with \`name\`, \`description\`, and \`schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"\`.
2. Top-level \`variable\` array containing \`baseUrl\` (set to \`${summary.baseUrl}\`) and \`bearerToken\` (empty placeholder).
3. Top-level \`auth\` configured for Bearer token using \`{{bearerToken}}\` if security is defined.
4. Organize \`item\` folders by OpenAPI tag. Inside each folder, create a Postman request item for every endpoint in that tag with:
   - \`name\`, \`request.method\`, \`request.header\`, \`request.url\` (with \`raw\`, \`host: ["{{baseUrl}}"]\`, \`path\`, \`query\`, and \`variable\` for path params),
   - Realistic JSON \`request.body\` in \`raw\` mode for endpoints with a requestBody,
   - Basic Postman \`event\` test script checking status codes and JSON response structure.
5. Output ONLY valid JSON (parseable by \`JSON.parse\`) with 2-space indentation.

${specHeader}`,
      };
    }

    case 'examples': {
      return {
        systemInstruction:
          'You are a developer advocate writing copy-pasteable API request examples. Output clean Markdown directly with no conversational preamble.',
        prompt: `Generate runnable request examples for EVERY endpoint in this OpenAPI specification.

Requirements:
1. Group examples by tag.
2. For every single endpoint, provide:
   - A brief heading with Method, Path, and Summary
   - A complete \`cURL\` command (bash block) with headers, auth placeholder, query params, and realistic JSON body
   - A complete TypeScript / JavaScript \`fetch\` snippet (typescript block) showing \`response.ok\` check and JSON parsing
3. Derive all field names, types, and enum values faithfully from the OpenAPI schemas.
4. Output clean Markdown ready to save directly.

${specHeader}`,
      };
    }
  }
}
