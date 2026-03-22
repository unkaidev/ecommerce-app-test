import { api, ApiError } from './api';

// ---------- helpers ----------

function mockFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function apiEnvelope<T>(data: T, statusCode = 200) {
  return { success: true, statusCode, message: 'Success', data };
}

describe('api — response envelope unwrapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear token so tests don't attach Authorization header
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  });

  it('unwraps paginated response: data.data is array and data.meta.total is number', async () => {
    mockFetch(
      apiEnvelope({
        data: [{ id: '1', name: 'Widget' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
    );

    const result = await api.products.list();

    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.meta.total).toBe('number');
    expect(result.meta.total).toBe(1);
  });

  it('keeps ApiResponse envelope for me endpoint (single resource)', async () => {
    mockFetch(
      apiEnvelope({ id: '1', email: 'user@test.com' }),
    );

    const result = await api.users.me();

    // me() returns ApiResponse<User> — the data field is the user
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('email');
  });

  it('throws ApiError with correct statusCode on 404', async () => {
    mockFetch({ message: 'Not Found' }, 404);

    await expect(api.products.getById('bad-id')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ApiError on 401 Unauthorized', async () => {
    mockFetch({ message: 'Unauthorized' }, 401);

    await expect(api.orders.list()).rejects.toBeInstanceOf(ApiError);
  });

  it('returns undefined for 204 No Content (cart clear)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);

    const result = await api.cart.clear();

    expect(result).toBeUndefined();
  });

  it('returns token pair from auth.login', async () => {
    mockFetch(apiEnvelope({ accessToken: 'at', refreshToken: 'rt' }));

    const result = await api.auth.login({ email: 'test@test.com', password: 'Pass1' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('builds correct query string for product list filters', async () => {
    mockFetch(
      apiEnvelope({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
    );

    await api.products.list({ page: 2, limit: 10, search: 'shirt', inStock: true });

    const fetchMock = global.fetch as jest.Mock;
    const calledUrl: string = fetchMock.mock.calls[0][0] as string;

    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('search=shirt');
    expect(calledUrl).toContain('inStock=true');
  });
});
