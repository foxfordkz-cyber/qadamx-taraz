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
    /**
     * Get Customers
     * @description Without ids: existing search and cursor pagination. With repeated query ids (ids=UUID&ids=UUID): 1-100 values before deduplication, first-occurrence order, only customers in the accessible business. Missing/foreign IDs are omitted equally. Explicit q, cursor or limit with ids returns 422. The complete result uses the same Page and server-calculated balances, with next_cursor=null; no default limit truncation.
     */
    get: operations["get_customers_api_v1_businesses__id__customers_get"];
    put?: never;
    /**
     * Create Customer
     * @description Optional Idempotency-Key scopes a durable creation to this user and business. Replay returns the original 201 snapshot; changed validated body returns 409. Without the key, each request creates a new customer (legacy behavior).
     */
    post: operations["create_customer_api_v1_businesses__id__customers_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/customer-creation-result": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Customer Creation Result
     * @description Recover this user's committed customer creation using Idempotency-Key. not_observed does not rule out an in-flight or delayed request. No automatic expiry.
     */
    get: operations["get_customer_creation_result_api_v1_businesses__id__customer_creation_result_get"];
    put?: never;
    post?: never;
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
  "/api/v1/businesses/{id}/analytics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Analytics */
    get: operations["get_analytics_api_v1_businesses__id__analytics_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/drafts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Create Draft
     * @description RU/KK text or audio → draft. No monetary write. Confirm via POST operations. Exactly one source; 30-minute expiry, author and business scoped, single use. AI failure leaves manual input available. Audio is decoded to WAV in memory.
     */
    post: operations["create_draft_api_v1_businesses__id__drafts_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/assistant": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Ask Assistant
     * @description Seller question → short answer from server-calculated facts of this business. The model only words the answer; every amount, count and customer is checked against facts, otherwise source=fallback with a server template. No ledger writes, nothing is sent: reminder_draft is text to copy. Disabled deployments return 404 ASSISTANT_DISABLED; a per-user daily limit returns 429 ASSISTANT_LIMIT.
     */
    post: operations["ask_assistant_api_v1_businesses__id__assistant_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/venues": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Venues */
    get: operations["venues_api_v1_venues_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Businesses */
    get: operations["businesses_api_v1_businesses_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{slug}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Shop */
    get: operations["shop_api_v1_businesses__slug__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/inquiries": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Inquiries */
    get: operations["inquiries_api_v1_businesses__id__inquiries_get"];
    put?: never;
    /** Create Inquiry */
    post: operations["create_inquiry_api_v1_businesses__id__inquiries_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/businesses/{id}/inquiries/{inquiry_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /** Update Inquiry */
    patch: operations["update_inquiry_api_v1_businesses__id__inquiries__inquiry_id__patch"];
    trace?: never;
  };
  "/api/v1/livestock/markets": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Markets */
    get: operations["markets_api_v1_livestock_markets_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/markets/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Market Detail */
    get: operations["market_detail_api_v1_livestock_markets__id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/listings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Feed */
    get: operations["feed_api_v1_livestock_listings_get"];
    put?: never;
    /** Publish */
    post: operations["publish_api_v1_livestock_listings_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/me/listings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Mine */
    get: operations["mine_api_v1_livestock_me_listings_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/listings/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Detail */
    get: operations["detail_api_v1_livestock_listings__id__get"];
    /** Edit */
    put: operations["edit_api_v1_livestock_listings__id__put"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/listings/{id}/actions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Action */
    post: operations["action_api_v1_livestock_listings__id__actions_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/prices": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Prices */
    get: operations["prices_api_v1_livestock_prices_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/photos": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Upload */
    post: operations["upload_api_v1_livestock_photos_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/listings/{id}/photos/{photo_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Public Photo */
    get: operations["public_photo_api_v1_livestock_listings__id__photos__photo_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/livestock/me/photos/{photo_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private Photo */
    get: operations["private_photo_api_v1_livestock_me_photos__photo_id__get"];
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
    /** AnalyticsCards */
    AnalyticsCards: {
      /** Sales Minor */
      sales_minor: number;
      /** Receipts Minor */
      receipts_minor: number;
      /** Sales Count */
      sales_count: number;
      /** Average Ticket Minor */
      average_ticket_minor: number | null;
      /** Outstanding Minor */
      outstanding_minor: number;
      /** Debtors Count */
      debtors_count: number;
    };
    /** AnalyticsDay */
    AnalyticsDay: {
      /**
       * Date
       * Format: date
       */
      date: string;
      /** Sales Minor */
      sales_minor: number;
      /** Receipts Minor */
      receipts_minor: number;
      /** Sales Count */
      sales_count: number;
      /** Is Partial */
      is_partial: boolean;
    };
    /** AnalyticsHour */
    AnalyticsHour: {
      /** Hour */
      hour: number;
      /** Sales Count */
      sales_count: number;
    };
    /** AnalyticsResponse */
    AnalyticsResponse: {
      /**
       * Business Id
       * Format: uuid
       */
      business_id: string;
      /**
       * Days
       * @enum {integer}
       */
      days: 7 | 30;
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
      /**
       * As Of
       * Format: date-time
       */
      as_of: string;
      /**
       * Period From
       * Format: date
       */
      period_from: string;
      /**
       * Period To
       * Format: date
       */
      period_to: string;
      /**
       * Today Incomplete
       * @default true
       * @constant
       */
      today_incomplete: true;
      cards: components["schemas"]["AnalyticsCards"];
      /** Daily */
      daily: components["schemas"]["AnalyticsDay"][];
      /** Hourly */
      hourly: components["schemas"]["AnalyticsHour"][];
    };
    /** AssistantAction */
    AssistantAction: {
      /**
       * Kind
       * @enum {string}
       */
      kind:
        | "open_debts"
        | "new_sale"
        | "open_history"
        | "open_analytics"
        | "reminder_draft";
      /** Customer Id */
      customer_id?: string | null;
      /** Text */
      text?: string | null;
    };
    /**
     * AssistantFact
     * @description A server-calculated value. The model may cite it but never produces it.
     */
    AssistantFact: {
      /**
       * Key
       * @enum {string}
       */
      key:
        | "sales"
        | "sales_previous"
        | "sales_change"
        | "receipts"
        | "outstanding"
        | "debtors"
        | "sales_count"
        | "average_ticket"
        | "today_sales"
        | "today_receipts"
        | "debtor";
      /** Label */
      label: string;
      /** Value Minor */
      value_minor?: number | null;
      /** Count */
      count?: number | null;
      /** Customer Id */
      customer_id?: string | null;
    };
    /** AssistantRequest */
    AssistantRequest: {
      /** Question */
      question: string;
      /**
       * Locale
       * @default ru
       * @enum {string}
       */
      locale: "ru" | "kk";
      /**
       * Days
       * @default 7
       * @enum {integer}
       */
      days: 7 | 30;
    };
    /** AssistantResponse */
    AssistantResponse: {
      /**
       * Business Id
       * Format: uuid
       */
      business_id: string;
      /**
       * Days
       * @enum {integer}
       */
      days: 7 | 30;
      /**
       * Locale
       * @enum {string}
       */
      locale: "ru" | "kk";
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
      /**
       * As Of
       * Format: date-time
       */
      as_of: string;
      /** Answer */
      answer: string;
      /** Facts */
      facts: components["schemas"]["AssistantFact"][];
      /** Actions */
      actions: components["schemas"]["AssistantAction"][];
      /**
       * Source
       * @enum {string}
       */
      source: "ai" | "fallback";
    };
    /** Body_upload_api_v1_livestock_photos_post */
    Body_upload_api_v1_livestock_photos_post: {
      /** File */
      file: string;
    };
    /** BusinessMembership */
    BusinessMembership: {
      name_i18n?: components["schemas"]["Translations"] | null;
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
    /** CatalogResponse */
    CatalogResponse: {
      name_i18n?: components["schemas"]["Translations"] | null;
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
      /** Name */
      name: string;
      /** Price Minor */
      price_minor: number | null;
      /** Available */
      available: boolean;
      /** Is Demo */
      is_demo: boolean;
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
    /** CustomerCreationCompleted */
    CustomerCreationCompleted: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      status: "completed";
      customer: components["schemas"]["CustomerResponse"];
    };
    /** CustomerCreationNotObserved */
    CustomerCreationNotObserved: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      status: "not_observed";
      /** Customer */
      customer: null;
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
       * @default mvp
       * @constant
       */
      stage: "mvp";
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
    /** InquiryReceipt */
    InquiryReceipt: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
    };
    /** InquiryResponse */
    InquiryResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
      /**
       * Business Id
       * Format: uuid
       */
      business_id: string;
      /** Visitor Name */
      visitor_name: string;
      /** Contact */
      contact: string;
      /** Message */
      message: string;
      /**
       * Status
       * @enum {string}
       */
      status: "new" | "in_progress" | "closed";
    };
    /** InquiryUpdate */
    InquiryUpdate: {
      /**
       * Status
       * @enum {string}
       */
      status: "new" | "in_progress" | "closed";
    };
    /** ListingAction */
    ListingAction: {
      /**
       * Action
       * @enum {string}
       */
      action: "confirm_today" | "sell" | "withdraw";
    };
    /** ListingPhoto */
    ListingPhoto: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Url */
      url: string;
    };
    /** ListingWrite */
    ListingWrite: {
      /** Market Id */
      market_id?: string | null;
      /**
       * Species
       * @enum {string}
       */
      species: "cattle" | "sheep" | "goat" | "horse" | "camel";
      /** Quantity */
      quantity: number;
      /** Price Per Head Minor */
      price_per_head_minor: number;
      /** Locality */
      locality: string;
      /** Market */
      market?: string | null;
      /** Age Months */
      age_months?: number | null;
      /** Sex */
      sex?: ("male" | "female" | "unknown") | null;
      /** Description */
      description?: string | null;
      /**
       * Photo Ids
       * @default []
       */
      photo_ids: string[];
      /** Contact */
      contact: string;
      /** Contact Consent */
      contact_consent: boolean;
    };
    /** MarketResponse */
    MarketResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Key */
      key: string;
      /** Name */
      name: string;
      name_i18n?: components["schemas"]["Translations"] | null;
      /** Locality */
      locality: string;
      /**
       * Verification Status
       * @enum {string}
       */
      verification_status: "unverified" | "verified" | "retired";
      /** Verified At */
      verified_at: string | null;
      /**
       * Accepts Listings
       * @default false
       */
      accepts_listings: boolean;
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
    /** OwnerListing */
    OwnerListing: {
      /** Market Id */
      market_id?: string | null;
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Species
       * @enum {string}
       */
      species: "cattle" | "sheep" | "goat" | "horse" | "camel";
      /** Quantity */
      quantity: number;
      /** Price Per Head Minor */
      price_per_head_minor: number;
      /** Locality */
      locality: string;
      /** Market */
      market?: string | null;
      /** Age Months */
      age_months: number | null;
      /** Sex */
      sex: ("male" | "female" | "unknown") | null;
      /** Description */
      description: string | null;
      /** Contact */
      contact: string;
      /**
       * Currency
       * @default KZT
       * @constant
       */
      currency: "KZT";
      /** Photos */
      photos: components["schemas"]["ListingPhoto"][];
      /**
       * Confirmed On
       * Format: date
       */
      confirmed_on: string;
      /** Is Demo */
      is_demo: boolean;
      /**
       * Status
       * @enum {string}
       */
      status: "active" | "sold" | "withdrawn";
      /** Available Today */
      available_today: boolean;
      /**
       * Created At
       * Format: date-time
       */
      created_at: string;
      /**
       * Updated At
       * Format: date-time
       */
      updated_at: string;
    };
    /** Page[CustomerResponse] */
    Page_CustomerResponse_: {
      /** Items */
      items: components["schemas"]["CustomerResponse"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[InquiryResponse] */
    Page_InquiryResponse_: {
      /** Items */
      items: components["schemas"]["InquiryResponse"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[MarketResponse] */
    Page_MarketResponse_: {
      /** Items */
      items: components["schemas"]["MarketResponse"][];
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
    /** Page[OwnerListing] */
    Page_OwnerListing_: {
      /** Items */
      items: components["schemas"]["OwnerListing"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[PublicBusiness] */
    Page_PublicBusiness_: {
      /** Items */
      items: components["schemas"]["PublicBusiness"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[PublicListing] */
    Page_PublicListing_: {
      /** Items */
      items: components["schemas"]["PublicListing"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** Page[VenueResponse] */
    Page_VenueResponse_: {
      /** Items */
      items: components["schemas"]["VenueResponse"][];
      /** Next Cursor */
      next_cursor?: string | null;
    };
    /** PhotoReceipt */
    PhotoReceipt: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
    };
    /** PriceStats */
    PriceStats: {
      /** Market Id */
      market_id?: string | null;
      /**
       * Species
       * @enum {string}
       */
      species: "cattle" | "sheep" | "goat" | "horse" | "camel";
      /** Locality */
      locality: string;
      /** Market */
      market?: string | null;
      /**
       * Period From
       * Format: date
       */
      period_from: string;
      /**
       * Period To
       * Format: date
       */
      period_to: string;
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
      /**
       * Unit
       * @default head
       * @constant
       */
      unit: "head";
      /** Sample Count */
      sample_count: number;
      /** Min Price Per Head Minor */
      min_price_per_head_minor?: number | null;
      /** Median Price Per Head Minor */
      median_price_per_head_minor: number | null;
      /**
       * Status
       * @enum {string}
       */
      status: "available" | "insufficient_data";
      /**
       * Source
       * @default asking_prices
       * @constant
       */
      source: "asking_prices";
    };
    /** PublicBusiness */
    PublicBusiness: {
      name_i18n?: components["schemas"]["Translations"] | null;
      description_i18n?: components["schemas"]["Translations"] | null;
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Venue Id
       * Format: uuid
       */
      venue_id: string;
      /** Slug */
      slug: string;
      /** Name */
      name: string;
      /** Category */
      category: string;
      /** Description */
      description: string;
      /** Is Demo */
      is_demo: boolean;
    };
    /** PublicListing */
    PublicListing: {
      /** Market Id */
      market_id?: string | null;
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Species
       * @enum {string}
       */
      species: "cattle" | "sheep" | "goat" | "horse" | "camel";
      /** Quantity */
      quantity: number;
      /** Price Per Head Minor */
      price_per_head_minor: number;
      /** Locality */
      locality: string;
      /** Market */
      market?: string | null;
      /** Age Months */
      age_months: number | null;
      /** Sex */
      sex: ("male" | "female" | "unknown") | null;
      /** Description */
      description: string | null;
      /** Contact */
      contact: string;
      /**
       * Currency
       * @default KZT
       * @constant
       */
      currency: "KZT";
      /** Photos */
      photos: components["schemas"]["ListingPhoto"][];
      /**
       * Confirmed On
       * Format: date
       */
      confirmed_on: string;
      /** Is Demo */
      is_demo: boolean;
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
    /** ShopResponse */
    ShopResponse: {
      name_i18n?: components["schemas"]["Translations"] | null;
      description_i18n?: components["schemas"]["Translations"] | null;
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Venue Id
       * Format: uuid
       */
      venue_id: string;
      /** Slug */
      slug: string;
      /** Name */
      name: string;
      /** Category */
      category: string;
      /** Description */
      description: string;
      /** Is Demo */
      is_demo: boolean;
      /** Catalog */
      catalog: components["schemas"]["CatalogResponse"][];
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
    /** Translations */
    Translations: {
      /** Ru */
      ru?: string | null;
      /** Kk */
      kk?: string | null;
    };
    /** VenueResponse */
    VenueResponse: {
      name_i18n?: components["schemas"]["Translations"] | null;
      address_label_i18n?: components["schemas"]["Translations"] | null;
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Slug */
      slug: string;
      /** Name */
      name: string;
      /** Address Label */
      address_label: string;
      /** Geometry Status */
      geometry_status: string;
      /** Is Demo */
      is_demo: boolean;
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
      query?: {
        lang?: ("ru" | "kk") | null;
      };
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
        /** @description Repeat ids once per UUID (form/explode). Empty values or >100 entries return 422; duplicates count toward the limit and are returned once. Do not combine with q, cursor or limit, even their default/empty values. */
        ids?: string[] | null;
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
      header?: {
        "Idempotency-Key"?: string | null;
      };
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
  get_customer_creation_result_api_v1_businesses__id__customer_creation_result_get: {
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
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json":
            | components["schemas"]["CustomerCreationCompleted"]
            | components["schemas"]["CustomerCreationNotObserved"];
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
  get_analytics_api_v1_businesses__id__analytics_get: {
    parameters: {
      query?: {
        days?: 7 | 30;
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
          "application/json": components["schemas"]["AnalyticsResponse"];
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
  create_draft_api_v1_businesses__id__drafts_post: {
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
        "multipart/form-data": {
          text?: string;
          /**
           * Format: binary
           * @description <=8 MiB, <=30s
           */
          audio?: string;
          /**
           * @default auto
           * @enum {string}
           */
          locale?: "ru" | "kk" | "auto";
        } & (unknown | unknown);
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DraftResponse"];
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
      /** @description Request Entity Too Large */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Unsupported Media Type */
      415: {
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
      /** @description Gateway Timeout */
      504: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  ask_assistant_api_v1_businesses__id__assistant_post: {
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
        "application/json": components["schemas"]["AssistantRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AssistantResponse"];
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
      /** @description Too Many Requests */
      429: {
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
  venues_api_v1_venues_get: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string | null;
        lang?: ("ru" | "kk") | null;
      };
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
          "application/json": components["schemas"]["Page_VenueResponse_"];
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
  businesses_api_v1_businesses_get: {
    parameters: {
      query?: {
        venue_id?: string | null;
        lang?: ("ru" | "kk") | null;
        category?: string;
        q?: string;
        limit?: number;
        cursor?: string | null;
      };
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
          "application/json": components["schemas"]["Page_PublicBusiness_"];
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
  shop_api_v1_businesses__slug__get: {
    parameters: {
      query?: {
        lang?: ("ru" | "kk") | null;
      };
      header?: never;
      path: {
        slug: string;
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
          "application/json": components["schemas"]["ShopResponse"];
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
  inquiries_api_v1_businesses__id__inquiries_get: {
    parameters: {
      query?: {
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
          "application/json": components["schemas"]["Page_InquiryResponse_"];
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
  create_inquiry_api_v1_businesses__id__inquiries_post: {
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
        "application/json": components["schemas"]["InquiryCreate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["InquiryReceipt"];
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
      /** @description Too Many Requests */
      429: {
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
  update_inquiry_api_v1_businesses__id__inquiries__inquiry_id__patch: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        inquiry_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InquiryUpdate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["InquiryResponse"];
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
  markets_api_v1_livestock_markets_get: {
    parameters: {
      query?: {
        status?: "unverified" | "verified" | "retired";
        lang?: ("ru" | "kk") | null;
        limit?: number;
        cursor?: string | null;
      };
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
          "application/json": components["schemas"]["Page_MarketResponse_"];
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
  market_detail_api_v1_livestock_markets__id__get: {
    parameters: {
      query?: {
        lang?: ("ru" | "kk") | null;
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
          "application/json": components["schemas"]["MarketResponse"];
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
  feed_api_v1_livestock_listings_get: {
    parameters: {
      query?: {
        species?: ("cattle" | "sheep" | "goat" | "horse" | "camel") | null;
        locality?: string | null;
        market?: string | null;
        market_id?: string | null;
        limit?: number;
        cursor?: string | null;
      };
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
          "application/json": components["schemas"]["Page_PublicListing_"];
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
  publish_api_v1_livestock_listings_post: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ListingWrite"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OwnerListing"];
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
  mine_api_v1_livestock_me_listings_get: {
    parameters: {
      query?: {
        status?: ("active" | "sold" | "withdrawn") | null;
        species?: ("cattle" | "sheep" | "goat" | "horse" | "camel") | null;
        locality?: string | null;
        market?: string | null;
        market_id?: string | null;
        limit?: number;
        cursor?: string | null;
      };
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
          "application/json": components["schemas"]["Page_OwnerListing_"];
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
  detail_api_v1_livestock_listings__id__get: {
    parameters: {
      query?: never;
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
          "application/json": components["schemas"]["PublicListing"];
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
  edit_api_v1_livestock_listings__id__put: {
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
        "application/json": components["schemas"]["ListingWrite"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OwnerListing"];
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
  action_api_v1_livestock_listings__id__actions_post: {
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
        "application/json": components["schemas"]["ListingAction"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OwnerListing"];
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
  prices_api_v1_livestock_prices_get: {
    parameters: {
      query: {
        species: "cattle" | "sheep" | "goat" | "horse" | "camel";
        locality: string;
        market?: string | null;
        market_id?: string | null;
      };
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
          "application/json": components["schemas"]["PriceStats"];
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
  upload_api_v1_livestock_photos_post: {
    parameters: {
      query?: never;
      header: {
        "Idempotency-Key": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "multipart/form-data": components["schemas"]["Body_upload_api_v1_livestock_photos_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PhotoReceipt"];
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
      /** @description Request Entity Too Large */
      413: {
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
      /** @description Too Many Requests */
      429: {
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
  public_photo_api_v1_livestock_listings__id__photos__photo_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        photo_id: string;
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
          "image/jpeg": string;
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
  private_photo_api_v1_livestock_me_photos__photo_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        photo_id: string;
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
          "image/jpeg": string;
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
