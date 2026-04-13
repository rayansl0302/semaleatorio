/**
 * OpenAPI 3.0 — SemAleatório backend (Express).
 * Respostas `{ result }` / `{ error }` alinhadas ao cliente (`src/firebase/api.ts`).
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SemAleatório API',
    version: '1.0.0',
    description:
      'Backend Railway: Riot OAuth, rank, avaliações, checkout Asaas e webhook. ' +
      'Rotas `/api/*` (exceto webhook) esperam corpo `{ "data": { ... } }` e header `Authorization: Bearer <Firebase ID token>`.',
  },
  servers: [{ url: '/', description: 'Host atual (ex.: Railway)' }],
  tags: [
    { name: 'Health', description: 'Estado do serviço' },
    { name: 'Riot', description: 'OAuth e elo' },
    { name: 'Ratings', description: 'Avaliações entre utilizadores' },
    { name: 'Asaas', description: 'Pagamentos e webhook' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase Auth ID token (mesmo do cliente web).',
      },
      AsaasWebhookToken: {
        type: 'apiKey',
        in: 'header',
        name: 'asaas-access-token',
        description: 'Token configurado em ASAAS_WEBHOOK_TOKEN (Asaas → webhook).',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
        required: ['error'],
      },
      WrappedResult: {
        type: 'object',
        properties: {
          result: { description: 'Payload específico de cada rota' },
        },
        required: ['result'],
      },
      DataWrapper: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            additionalProperties: true,
            description: 'Campos da operação (ver cada rota).',
          },
        },
      },
      PrepareRiotOAuthResult: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL de autorização Riot (redirect do browser).',
          },
        },
        required: ['url'],
      },
      CompleteRiotOAuthData: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
        },
        required: ['code', 'state'],
      },
      CompleteRiotOAuthResult: {
        type: 'object',
        properties: {
          gameName: { type: 'string' },
          tagLine: { type: 'string' },
          puuid: { type: 'string' },
          elo: { type: 'string', nullable: true },
        },
        required: ['gameName', 'tagLine', 'puuid'],
      },
      FetchRiotRankData: {
        type: 'object',
        properties: {
          gameName: { type: 'string', example: 'Faker' },
          tagLine: { type: 'string', example: 'KR1' },
        },
        required: ['gameName', 'tagLine'],
      },
      FetchRiotRankResult: {
        type: 'object',
        properties: {
          elo: { type: 'string', example: 'DIAMOND I' },
          puuid: { type: 'string' },
        },
        required: ['elo', 'puuid'],
      },
      SubmitRatingData: {
        type: 'object',
        properties: {
          toUid: { type: 'string' },
          communication: { type: 'integer', minimum: 1, maximum: 5 },
          skill: { type: 'integer', minimum: 1, maximum: 5 },
          toxicity: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['toUid', 'communication', 'skill', 'toxicity'],
      },
      SubmitRatingResult: {
        type: 'object',
        properties: { ok: { type: 'boolean', const: true } },
        required: ['ok'],
      },
      CreateAsaasCheckoutData: {
        type: 'object',
        properties: {
          product: {
            type: 'string',
            enum: ['premium_monthly', 'boost_1h', 'boost_3h'],
          },
        },
        required: ['product'],
      },
      CreateAsaasCheckoutResult: {
        type: 'object',
        properties: {
          paymentId: { type: 'string' },
          invoiceUrl: { type: 'string', nullable: true },
        },
      },
      AsaasWebhookBody: {
        type: 'object',
        description: 'Payload enviado pelo Asaas (event + payment, etc.).',
        additionalProperties: true,
      },
      AsaasWebhookOk: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          duplicate: { type: 'boolean' },
          skip: { type: 'boolean' },
          ignored: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Serviço ativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', const: true },
                    service: { type: 'string', example: 'semaleatorio-backend' },
                  },
                  required: ['ok', 'service'],
                },
              },
            },
          },
        },
      },
    },
    '/api/prepareRiotOAuth': {
      post: {
        tags: ['Riot'],
        summary: 'Iniciar OAuth Riot',
        description: 'Gera `state`, grava no Firestore e devolve URL de autorização.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/DataWrapper' },
                  {
                    type: 'object',
                    properties: { data: { type: 'object' } },
                  },
                ],
              },
              example: { data: {} },
            },
          },
        },
        responses: {
          '200': {
            description: 'URL de redirect',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/WrappedResult' },
                    {
                      type: 'object',
                      properties: {
                        result: { $ref: '#/components/schemas/PrepareRiotOAuthResult' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '4XX': {
            description: 'Erro de validação ou pré-condição',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
            },
          },
        },
      },
    },
    '/api/completeRiotOAuth': {
      post: {
        tags: ['Riot'],
        summary: 'Concluir OAuth Riot',
        description: 'Troca `code` por token, lê conta Riot e atualiza o perfil no Firestore.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/CompleteRiotOAuthData' },
                },
                required: ['data'],
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: { $ref: '#/components/schemas/CompleteRiotOAuthResult' },
                  },
                  required: ['result'],
                },
              },
            },
          },
          '4XX': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
            },
          },
        },
      },
    },
    '/api/fetchRiotRank': {
      post: {
        tags: ['Riot'],
        summary: 'Consultar elo (Riot ID)',
        description: 'Usa RIOT_API_KEY no servidor; requer utilizador autenticado.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/FetchRiotRankData' },
                },
                required: ['data'],
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: { $ref: '#/components/schemas/FetchRiotRankResult' },
                  },
                  required: ['result'],
                },
              },
            },
          },
          '4XX': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
            },
          },
        },
      },
    },
    '/api/submitRating': {
      post: {
        tags: ['Ratings'],
        summary: 'Submeter avaliação',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/SubmitRatingData' },
                },
                required: ['data'],
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: { $ref: '#/components/schemas/SubmitRatingResult' },
                  },
                  required: ['result'],
                },
              },
            },
          },
          '4XX': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
            },
          },
        },
      },
    },
    '/api/createAsaasCheckout': {
      post: {
        tags: ['Asaas'],
        summary: 'Criar cobrança PIX (checkout)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/CreateAsaasCheckoutData' },
                },
                required: ['data'],
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: { $ref: '#/components/schemas/CreateAsaasCheckoutResult' },
                  },
                  required: ['result'],
                },
              },
            },
          },
          '4XX': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
            },
          },
        },
      },
    },
    '/api/asaasWebhook': {
      post: {
        tags: ['Asaas'],
        summary: 'Webhook Asaas',
        description:
          'Chamado pelo Asaas em eventos de pagamento. Resposta JSON ou texto em erro (401).',
        security: [{ AsaasWebhookToken: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AsaasWebhookBody' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Processado (pode incluir duplicate/skip/ignored)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AsaasWebhookOk' },
              },
            },
          },
          '401': { description: 'Token inválido (corpo texto)' },
          '500': {
            description: 'Erro interno',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { error: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const
