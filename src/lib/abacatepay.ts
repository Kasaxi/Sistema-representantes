import crypto from 'node:crypto';

const ABACATEPAY_API_URL = process.env.NEXT_PUBLIC_ABACATEPAY_URL || 'https://api.abacatepay.com/v2';
const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY || '';
const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY || 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

export interface AbacatePayConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface Customer {
  id?: string;
  name: string;
  email: string;
  taxId: string;
  cellphone: string;
}

export interface Product {
  id: string;
  quantity: number;
}

export interface CreateCheckoutParams {
  items: Product[];
  customerId?: string;
  customer?: Customer;
  methods: ('PIX' | 'CARD')[];
  returnUrl: string;
  completionUrl: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionParams {
  items: Product[];
  customerId?: string;
  customer?: Customer;
  methods?: ('PIX' | 'CARD')[];
  returnUrl: string;
  completionUrl: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResponse {
  data: {
    id: string;
    externalId: string | null;
    url: string;
    amount: number;
    paidAmount: number | null;
    items: Array<{ id: string; quantity: number }>;
    status: 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'PAID' | 'REFUNDED';
    methods: string[];
    customerId: string | null;
    returnUrl: string | null;
    completionUrl: string | null;
    receiptUrl: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  error: string | null;
  success: boolean;
}

export interface SubscriptionResponse {
  data: {
    id: string;
    externalId: string | null;
    url: string;
    amount: number;
    paidAmount: number | null;
    frequency: string;
    status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE';
    customerId: string | null;
    items: Array<{ id: string; quantity: number }>;
    createdAt: string;
    updatedAt: string;
  };
  error: string | null;
  success: boolean;
}

export interface CustomerResponse {
  data: {
    id: string;
    name: string;
    email: string;
    taxId: string;
    createdAt: string;
    updatedAt: string;
  };
  error: string | null;
  success: boolean;
}

export interface ProductResponse {
  data: {
    id: string;
    externalId: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    cycle: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
  };
  error: string | null;
  success: boolean;
}

export interface WebhookPayload {
  id: string;
  event: string;
  apiVersion: number;
  devMode: boolean;
  data: {
    subscription?: {
      id: string;
      amount: number;
      status: string;
      frequency: string;
      canceledAt?: string;
    };
    checkout?: {
      id: string;
      externalId: string | null;
      amount: number;
      status: string;
      metadata?: Record<string, unknown>;
    };
    transparent?: {
      id: string;
      externalId: string | null;
      amount: number;
      status: string;
      metadata?: Record<string, unknown>;
    };
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

class AbacatePay {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: AbacatePayConfig) {
    this.apiKey = config?.apiKey || ABACATEPAY_API_KEY;
    this.baseUrl = config?.baseUrl || ABACATEPAY_API_URL;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    return this.request<CustomerResponse>('/customer/create', 'POST', customer);
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customer/get?id=${customerId}`);
  }

  async createProduct(product: {
    externalId: string;
    name: string;
    price: number;
    currency?: string;
    description?: string;
    cycle?: 'WEEKLY' | 'MONTHLY' | 'SEMIANNUALLY' | 'ANNUALLY' | null;
  }): Promise<ProductResponse> {
    return this.request<ProductResponse>('/products/create', 'POST', {
      ...product,
      currency: product.currency || 'BRL',
    });
  }

  async getProduct(productId: string): Promise<ProductResponse> {
    return this.request<ProductResponse>(`/products/get?id=${productId}`);
  }

  async createCheckout(checkout: CreateCheckoutParams): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>('/checkout/create', 'POST', checkout);
  }

  async createSubscriptionCheckout(checkout: CreateSubscriptionParams): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>('/subscriptions/create', 'POST', checkout);
  }

  async getCheckout(checkoutId: string): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>(`/checkout/get?id=${checkoutId}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<{ data: unknown; error: string | null; success: boolean }> {
    return this.request('/subscriptions/cancel', 'POST', { id: subscriptionId });
  }

  verifySignature(rawBody: string, signatureFromHeader: string): boolean {
    const bodyBuffer = Buffer.from(rawBody, 'utf8');

    const expectedSig = crypto
      .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
      .update(bodyBuffer)
      .digest('base64');

    const A = Buffer.from(expectedSig);
    const B = Buffer.from(signatureFromHeader);

    if (A.length !== B.length) return false;
    
    try {
      return crypto.timingSafeEqual(A, B);
    } catch {
      return false;
    }
  }

  isDevMode(payload: WebhookPayload): boolean {
    return payload.devMode === true;
  }
}

export const abacatepay = new AbacatePay();

export default AbacatePay;
