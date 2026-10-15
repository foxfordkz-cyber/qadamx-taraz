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
  "/api/v1/me": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Me */
    get: operations["me_api_v1_me_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/customers": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Customers */
    get: operations["get_customers_api_v1_businesses__id__customers_get"];
    put?: never;
    /** Create Customer */
    post: operations["create_customer_api_v1_businesses__id__customers_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/operations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Operations */
    get: operations["get_operations_api_v1_businesses__id__operations_get"];
    put?: never;
    /** Create Operation */
    post: operations["create_operation_api_v1_businesses__id__operations_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/operations/{operation_id}/reverse": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reverse Operation */
    post: operations["reverse_operation_api_v1_businesses__id__operations__operation_id__reverse_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/summary": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Summary */
    get: operations["get_summary_api_v1_businesses__id__summary_get"];
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
    /** BusinessMembership */
    BusinessMembership: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Slug */
      slug: string;
      /** Name */
      name: string;
      /**
       * Role
       * @default owner
       * @constant
       */
      role: "owner";
    };
    /** CustomerCreate */
    CustomerCreate: {
      /** Display Name */
      display_name: string;
      /**
       * Note
       * @default
       */
      note: string;
      /** Contact */
      contact?: string | null;
    };
    /** CustomerResponse */
    CustomerResponse: {
      /** Display Name */
      display_name: string;
      /**
       * Note
       * @default
       */
      note: string;
      /** Contact */
      contact?: string | null;
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
      /** Balance Minor */
      balance_minor: number;
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
    /** ErrorResponse */
    ErrorResponse: {
      error: components["schemas"]["ErrorDetail"];
      /**
       * Request Id
       * Format: uuid
       */
      request_id: string;
    };
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
       * @default manual-ledger
       * @constant
       */
      stage: "manual-ledger";
    };
    /** MeResponse */
    MeResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Businesses */
      businesses: components["schemas"]["BusinessMembership"][];
    };
    /** OpenSale */
    OpenSale: {
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
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
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
    /** OperationResponse */
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
    /** Page[CustomerResponse] */
    Page_CustomerResponse_: {
      /** Items */
      items: components["schemas"]["CustomerResponse"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[OpenSale] */
    Page_OpenSale_: {
      /** Items */
      items: components["schemas"]["OpenSale"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[Operation] */
    Page_Operation_: {
      /** Items */
      items: components["schemas"]["Operation"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** RepaymentCreate */
    RepaymentCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "repayment";
      /** Draft Id */
      draft_id?: string | null;
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
    /** ReverseCreate */
    ReverseCreate: {
      /** Description */
      description: string;
    };
    /** SaleCreate */
    SaleCreate: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      kind: "sale";
      /** Draft Id */
      draft_id?: string | null;
      /** Customer Id */
      customer_id?: string | null;
      /** Description */
      description: string;
      /** Total Minor */
      total_minor: number;
      /** Received Minor */
      received_minor: number;
    };
    /** SummaryResponse */
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
    /** DraftResponse */
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
      sale_candidates: components["schemas"]["OpenSale"][];
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
    /** InquiryCreate */
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
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
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
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  me_api_v1_me_get: {
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
          "application/json": components["schemas"]["MeResponse"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  get_customers_api_v1_businesses__id__customers_get: {
    parameters: {
      query?: {
        q?: string;
        limit?: number;
        cursor?: string | null;
      };
      header?: never;
      path: {
        id: string;
      };
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
          "application/json": components["schemas"]["Page_CustomerResponse_"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  create_customer_api_v1_businesses__id__customers_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CustomerCreate"];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CustomerResponse"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  get_operations_api_v1_businesses__id__operations_get: {
    parameters: {
      query?: {
        date?: string | null;
        customer_id?: string | null;
        outstanding_only?: boolean;
        limit?: number;
        cursor?: string | null;
      };
      header?: never;
      path: {
        id: string;
      };
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
          "application/json":
            | components["schemas"]["Page_Operation_"]
            | components["schemas"]["Page_OpenSale_"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  create_operation_api_v1_businesses__id__operations_post: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json":
          | components["schemas"]["SaleCreate"]
          | components["schemas"]["RepaymentCreate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationResponse"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  reverse_operation_api_v1_businesses__id__operations__operation_id__reverse_post: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
      };
      path: {
        id: string;
        operation_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ReverseCreate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationResponse"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  get_summary_api_v1_businesses__id__summary_get: {
    parameters: {
      query?: {
        date?: string | null;
      };
      header?: never;
      path: {
        id: string;
      };
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
          "application/json": components["schemas"]["SummaryResponse"];
        };
      };
      /** @description Unauthorized */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not Found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unprocessable Entity */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Service Unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
}
