// Generated from packages/contracts/openapi.json. Do not edit.
export interface paths {
  "/api/v1/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Health */
    get: operations["health_api_v1_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Health */
    get: operations["health_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /** HealthResponse */
    HealthResponse: {
      /**
       * Status
       * @default ok
       * @constant
       */
      status: "ok";
      /**
       * Service
       * @default qadam-api
       * @constant
       */
      service: "qadam-api";
      /**
       * Stage
       * @default bootstrap
       * @constant
       */
      stage: "bootstrap";
    };
    /** CustomerCandidate */
    CustomerCandidate: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Display Name */
      display_name: string;
    };
    /**
     * DraftResponse
     * @example {
     *       "id": "40000000-0000-4000-8000-000000000001",
     *       "transcript": "Асқарға үш мың теңгеге тауар бердім, мыңын төледі",
     *       "kind": "sale",
     *       "customer_query": "Асқар",
     *       "customer_candidates": [
     *         {
     *           "id": "20000000-0000-4000-8000-000000000001",
     *           "display_name": "Демо Асқар"
     *         }
     *       ],
     *       "sale_candidates": [],
     *       "description": "Тауар",
     *       "total_minor": 300000,
     *       "received_minor": 100000,
     *       "amount_minor": null,
     *       "missing_fields": [],
     *       "questions": [],
     *       "expires_at": "2026-10-15T10:30:00Z"
     *     }
     */
    DraftResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Transcript */
      transcript: string;
      /**
       * Kind
       * @enum {string}
       */
      kind: "sale" | "repayment" | "unknown";
      /** Customer Query */
      customer_query: string | null;
      /** Customer Candidates */
      customer_candidates: components["schemas"]["CustomerCandidate"][];
      /** Sale Candidates */
      sale_candidates: components["schemas"]["SaleCandidate"][];
      /** Description */
      description: string | null;
      /** Total Minor */
      total_minor: number | null;
      /** Received Minor */
      received_minor: number | null;
      /** Amount Minor */
      amount_minor: number | null;
      /** Missing Fields */
      missing_fields: string[];
      /** Questions */
      questions: string[];
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string;
    };
    /** ErrorDetail */
    ErrorDetail: {
      /** Code */
      code: string;
      /** Message */
      message: string;
      /** Fields */
      fields?: {
        [key: string]: string[];
      };
    };
    /**
     * ErrorResponse
     * @example {
     *       "error": {
     *         "code": "CUSTOMER_REQUIRED",
     *         "message": "A credit sale requires a customer",
     *         "fields": {
     *           "customer_id": [
     *             "CUSTOMER_REQUIRED"
     *           ]
     *         }
     *       },
     *       "request_id": "70000000-0000-4000-8000-000000000001"
     *     }
     */
    ErrorResponse: {
      error: components["schemas"]["ErrorDetail"];
      /**
       * Request Id
       * Format: uuid
       */
      request_id: string;
    };
    /**
     * InquiryCreate
     * @example {
     *       "client_request_id": "60000000-0000-4000-8000-000000000001",
     *       "visitor_name": "Демо-покупатель",
     *       "contact": "demo@example.test",
     *       "message": "Есть ли школьный рюкзак до 15 000 тенге?"
     *     }
     */
    InquiryCreate: {
      /**
       * Client Request Id
       * Format: uuid
       */
      client_request_id: string;
      /** Visitor Name */
      visitor_name: string;
      /** Contact */
      contact: string;
      /** Message */
      message: string;
    };
    /** Operation */
    Operation: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Business Id
       * Format: uuid
       */
      business_id: string;
      /** Customer Id */
      customer_id: string | null;
      /**
       * Sale Id
       * Format: uuid
       */
      sale_id: string;
      /**
       * Kind
       * @enum {string}
       */
      kind: "sale" | "repayment" | "reversal";
      /** Sales Delta Minor */
      sales_delta_minor: number;
      /** Receipts Delta Minor */
      receipts_delta_minor: number;
      /** Reversal Of */
      reversal_of: string | null;
      /** Description */
      description: string;
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
      /**
       * Created By
       * Format: uuid
       */
      created_by: string;
    };
    /**
     * OperationResponse
     * @example {
     *       "operation": {
     *         "id": "30000000-0000-4000-8000-000000000001",
     *         "business_id": "10000000-0000-4000-8000-000000000001",
     *         "customer_id": "20000000-0000-4000-8000-000000000001",
     *         "sale_id": "30000000-0000-4000-8000-000000000001",
     *         "kind": "sale",
     *         "sales_delta_minor": 300000,
     *         "receipts_delta_minor": 100000,
     *         "reversal_of": null,
     *         "description": "Учебный товар",
     *         "created_at": "2026-10-15T10:00:00Z",
     *         "created_by": "50000000-0000-4000-8000-000000000001"
     *       },
     *       "sale_balance_minor": 200000,
     *       "customer_balance_minor": 200000,
     *       "created_at": "2026-10-15T10:00:00Z"
     *     }
     */
    OperationResponse: {
      operation: components["schemas"]["Operation"];
      /** Sale Balance Minor */
      sale_balance_minor: number;
      /** Customer Balance Minor */
      customer_balance_minor: number | null;
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
    };
    /**
     * RepaymentCreate
     * @example {
     *       "kind": "repayment",
     *       "draft_id": null,
     *       "sale_id": "30000000-0000-4000-8000-000000000001",
     *       "amount_minor": 50000,
     *       "description": "Учебная частичная оплата"
     *     }
     */
    RepaymentCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "repayment";
      /**
       * Draft Id
       * @default null
       */
      draft_id: string | null;
      /**
       * Sale Id
       * Format: uuid
       */
      sale_id: string;
      /** Amount Minor */
      amount_minor: number;
      /** Description */
      description: string;
    };
    /** SaleCandidate */
    SaleCandidate: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Customer Id */
      customer_id: string | null;
      /** Description */
      description: string;
      /** Total Minor */
      total_minor: number;
      /** Received Minor */
      received_minor: number;
      /** Balance Minor */
      balance_minor: number;
    };
    /**
     * SaleCreate
     * @example {
     *       "kind": "sale",
     *       "draft_id": null,
     *       "customer_id": "20000000-0000-4000-8000-000000000001",
     *       "description": "Учебный товар",
     *       "total_minor": 300000,
     *       "received_minor": 100000
     *     }
     */
    SaleCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "sale";
      /**
       * Draft Id
       * @default null
       */
      draft_id: string | null;
      /**
       * Customer Id
       * @default null
       */
      customer_id: string | null;
      /** Description */
      description: string;
      /** Total Minor */
      total_minor: number;
      /** Received Minor */
      received_minor: number;
    };
    /**
     * SummaryResponse
     * @example {
     *       "date": "2026-10-15",
     *       "timezone": "Asia/Almaty",
     *       "currency": "KZT",
     *       "sales_minor": 300000,
     *       "receipts_minor": 150000,
     *       "outstanding_minor": 150000,
     *       "new_inquiries_count": 1
     *     }
     */
    SummaryResponse: {
      /**
       * Date
       * Format: date
       */
      date: string;
      /**
       * Timezone
       * @default Asia/Almaty
       * @constant
       */
      timezone: "Asia/Almaty";
      /**
       * Currency
       * @default KZT
       * @constant
       */
      currency: "KZT";
      /** Sales Minor */
      sales_minor: number;
      /** Receipts Minor */
      receipts_minor: number;
      /** Outstanding Minor */
      outstanding_minor: number;
      /** New Inquiries Count */
      new_inquiries_count: number;
    };
    OperationCreate:
      | components["schemas"]["SaleCreate"]
      | components["schemas"]["RepaymentCreate"];
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  health_api_v1_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HealthResponse"];
        };
      };
    };
  };
  health_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HealthResponse"];
        };
      };
    };
  };
}
