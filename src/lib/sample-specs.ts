export interface SampleSpecPreset {
  id: string;
  name: string;
  format: 'json' | 'yaml';
  summary: string;
  spec: string;
}

export const SAMPLE_SPECS: SampleSpecPreset[] = [
  {
    id: 'ledger-yaml',
    name: 'Payments Ledger API (YAML)',
    format: 'yaml',
    summary: 'OpenAPI 3.0.3 · 6 endpoints · Accounts, Transfers, Webhooks',
    spec: `openapi: 3.0.3
info:
  title: Meridian Ledger API
  version: 2.1.0
  description: Double-entry payment ledger for programmatic accounts, instant transfers, and webhook event verification.
servers:
  - url: https://api.meridianledger.dev/v2
    description: Production API
tags:
  - name: Accounts
    description: Ledger account lifecycle and balances
  - name: Transfers
    description: Atomic debit and credit transfers
  - name: Webhooks
    description: Webhook delivery logs
paths:
  /accounts:
    get:
      tags: [Accounts]
      summary: List ledger accounts
      operationId: listAccounts
      parameters:
        - name: currency
          in: query
          schema:
            type: string
            example: USD
        - name: limit
          in: query
          schema:
            type: integer
            default: 25
      responses:
        "200":
          description: Paginated list of ledger accounts
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Account"
                  nextCursor:
                    type: string
                    nullable: true
    post:
      tags: [Accounts]
      summary: Create a ledger account
      operationId: createAccount
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateAccountInput"
      responses:
        "201":
          description: Account created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Account"
        "422":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
  /accounts/{accountId}:
    get:
      tags: [Accounts]
      summary: Retrieve account balance and status
      operationId: getAccount
      parameters:
        - name: accountId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Account details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Account"
        "404":
          description: Account not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
  /transfers:
    post:
      tags: [Transfers]
      summary: Execute an atomic ledger transfer
      operationId: createTransfer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTransferInput"
      responses:
        "201":
          description: Transfer settled
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Transfer"
        "409":
          description: Insufficient funds or idempotency conflict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"
  /transfers/{transferId}:
    get:
      tags: [Transfers]
      summary: Fetch transfer receipt
      operationId: getTransfer
      parameters:
        - name: transferId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Transfer record
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Transfer"
  /webhooks/deliveries:
    get:
      tags: [Webhooks]
      summary: List recent webhook deliveries
      operationId: listWebhookDeliveries
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [delivered, failed, pending]
      responses:
        "200":
          description: Delivery log items
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/WebhookDelivery"
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Account:
      type: object
      required: [id, name, currency, balanceCents, status, createdAt]
      properties:
        id:
          type: string
        name:
          type: string
        currency:
          type: string
        balanceCents:
          type: integer
        status:
          type: string
          enum: [active, frozen]
        createdAt:
          type: string
          format: date-time
    CreateAccountInput:
      type: object
      required: [name, currency]
      properties:
        name:
          type: string
        currency:
          type: string
          example: USD
    Transfer:
      type: object
      required: [id, sourceAccountId, destinationAccountId, amountCents, currency, settledAt]
      properties:
        id:
          type: string
        sourceAccountId:
          type: string
        destinationAccountId:
          type: string
        amountCents:
          type: integer
        currency:
          type: string
        reference:
          type: string
        settledAt:
          type: string
          format: date-time
    CreateTransferInput:
      type: object
      required: [sourceAccountId, destinationAccountId, amountCents, idempotencyKey]
      properties:
        sourceAccountId:
          type: string
        destinationAccountId:
          type: string
        amountCents:
          type: integer
          minimum: 1
        idempotencyKey:
          type: string
        reference:
          type: string
    WebhookDelivery:
      type: object
      required: [id, eventType, status, httpCode, deliveredAt]
      properties:
        id:
          type: string
        eventType:
          type: string
        status:
          type: string
          enum: [delivered, failed, pending]
        httpCode:
          type: integer
        deliveredAt:
          type: string
          format: date-time
    ApiError:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
security:
  - bearerAuth: []
`,
  },
  {
    id: 'petstore-json',
    name: 'Petstore Inventory API (JSON)',
    format: 'json',
    summary: 'OpenAPI 3.0.3 · 5 endpoints · Pets, Orders',
    spec: JSON.stringify(
      {
        openapi: '3.0.3',
        info: {
          title: 'Petstore Commerce API',
          version: '1.4.0',
          description: 'Inventory and order fulfillment endpoints for companion pet commerce.',
        },
        servers: [{ url: 'https://petstore3.example.com/api/v3' }],
        tags: [
          { name: 'Pets', description: 'Pet inventory catalog' },
          { name: 'Orders', description: 'Store order management' },
        ],
        paths: {
          '/pets': {
            get: {
              tags: ['Pets'],
              summary: 'Find pets by status',
              operationId: 'findPetsByStatus',
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  required: false,
                  schema: { type: 'string', enum: ['available', 'pending', 'sold'], default: 'available' },
                },
              ],
              responses: {
                '200': {
                  description: 'Matching pets',
                  content: {
                    'application/json': {
                      schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
                    },
                  },
                },
              },
            },
            post: {
              tags: ['Pets'],
              summary: 'Add a new pet to the store',
              operationId: 'addPet',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NewPet' },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'Created pet',
                  content: {
                    'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
                  },
                },
                '400': { description: 'Invalid payload' },
              },
            },
          },
          '/pets/{petId}': {
            get: {
              tags: ['Pets'],
              summary: 'Find pet by ID',
              operationId: 'getPetById',
              parameters: [
                { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
              ],
              responses: {
                '200': {
                  description: 'Pet found',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
                },
                '404': { description: 'Pet not found' },
              },
            },
            delete: {
              tags: ['Pets'],
              summary: 'Remove a pet record',
              operationId: 'deletePet',
              parameters: [
                { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
              ],
              responses: {
                '204': { description: 'Pet deleted' },
                '404': { description: 'Pet not found' },
              },
            },
          },
          '/store/orders': {
            post: {
              tags: ['Orders'],
              summary: 'Place an order for a pet',
              operationId: 'placeOrder',
              requestBody: {
                required: true,
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/OrderInput' } },
                },
              },
              responses: {
                '201': {
                  description: 'Order placed',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: 'object',
              required: ['id', 'name', 'status'],
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                category: { type: 'string' },
                status: { type: 'string', enum: ['available', 'pending', 'sold'] },
              },
            },
            NewPet: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                status: { type: 'string', enum: ['available', 'pending', 'sold'] },
              },
            },
            OrderInput: {
              type: 'object',
              required: ['petId', 'quantity'],
              properties: {
                petId: { type: 'integer' },
                quantity: { type: 'integer', minimum: 1 },
              },
            },
            Order: {
              type: 'object',
              required: ['id', 'petId', 'quantity', 'status'],
              properties: {
                id: { type: 'integer' },
                petId: { type: 'integer' },
                quantity: { type: 'integer' },
                status: { type: 'string', enum: ['placed', 'approved', 'delivered'] },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  },
  {
    id: 'taskflow-json',
    name: 'TaskFlow Workspace API (JSON)',
    format: 'json',
    summary: 'OpenAPI 3.1.0 · 4 endpoints · Projects, Tasks',
    spec: JSON.stringify(
      {
        openapi: '3.1.0',
        info: {
          title: 'TaskFlow Engineering API',
          version: '1.0.0',
          description: 'Lightweight sprint task and deployment status API.',
        },
        servers: [{ url: 'https://api.taskflow.io/v1' }],
        paths: {
          '/projects': {
            get: {
              tags: ['Projects'],
              summary: 'List active projects',
              operationId: 'listProjects',
              responses: {
                '200': {
                  description: 'Array of projects',
                  content: {
                    'application/json': {
                      schema: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                    },
                  },
                },
              },
            },
          },
          '/projects/{projectId}/tasks': {
            get: {
              tags: ['Tasks'],
              summary: 'List tasks for a project',
              operationId: 'listProjectTasks',
              parameters: [
                { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'done', in: 'query', schema: { type: 'boolean' } },
              ],
              responses: {
                '200': {
                  description: 'Tasks list',
                  content: {
                    'application/json': {
                      schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    },
                  },
                },
              },
            },
            post: {
              tags: ['Tasks'],
              summary: 'Create a task inside a project',
              operationId: 'createTask',
              parameters: [
                { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
              ],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['title'],
                      properties: {
                        title: { type: 'string' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                      },
                    },
                  },
                },
              },
              responses: {
                '201': {
                  description: 'Task created',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
                },
              },
            },
          },
          '/tasks/{taskId}': {
            patch: {
              tags: ['Tasks'],
              summary: 'Update task completion status',
              operationId: 'updateTask',
              parameters: [
                { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
              ],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        done: { type: 'boolean' },
                        title: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Updated task',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Project: {
              type: 'object',
              required: ['id', 'name', 'slug'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
            Task: {
              type: 'object',
              required: ['id', 'projectId', 'title', 'done'],
              properties: {
                id: { type: 'string' },
                projectId: { type: 'string' },
                title: { type: 'string' },
                priority: { type: 'string' },
                done: { type: 'boolean' },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  },
];
