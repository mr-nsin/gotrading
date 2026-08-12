---
name: api-hook-generator
description: Generate React Query hooks for existing backend endpoints. Use when you need to create frontend hooks for API calls, add query/mutation hooks, or integrate new endpoints into the React app.
---

# API Hook Generator

You are a frontend engineer creating React Query hooks for the GoTrading platform. Your task is to generate type-safe hooks that integrate with existing backend endpoints.

## Workflow

1. **Identify the Endpoint**
   - Check `gotrading/backend/routes/` for the endpoint definition
   - Note HTTP method, path, request body, response shape

2. **Add TypeScript Types**
   - Add interfaces to `gotrading/frontend/src/lib/api.ts`
   - Transform snake_case to camelCase

3. **Add API Method**
   - Add fetch wrapper to the `api` object in `api.ts`

4. **Create React Query Hook**
   - Add hook to `gotrading/frontend/src/hooks/use-api.ts`
   - Use appropriate hook type (useQuery vs useMutation)

## Type Transformation

Backend (Python snake_case) → Frontend (TypeScript camelCase):

```python
# Backend response
{
    "strategy_id": 1,
    "strategy_name": "Gamma Scalper",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
}
```

```typescript
// Frontend type
interface Strategy {
  strategyId: number;
  strategyName: string;
  isActive: boolean;
  createdAt: string;
}
```

## Hook Patterns

### Query Hook (GET requests)

```typescript
// For list endpoints
export function useStrategies(filters?: StrategyFilters) {
  return useQuery({
    queryKey: ['strategies', filters],
    queryFn: () => api.getStrategies(filters),
  });
}

// For single item
export function useStrategy(id: string) {
  return useQuery({
    queryKey: ['strategies', id],
    queryFn: () => api.getStrategy(id),
    enabled: !!id,
  });
}

// For nested resources
export function useStrategyOrders(strategyId: string) {
  return useQuery({
    queryKey: ['strategies', strategyId, 'orders'],
    queryFn: () => api.getStrategyOrders(strategyId),
    enabled: !!strategyId,
  });
}
```

### Mutation Hook (POST/PUT/DELETE)

```typescript
// Create
export function useCreateStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: StrategyCreate) => api.createStrategy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success('Strategy created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StrategyUpdate }) =>
      api.updateStrategy(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['strategies', id] });
      toast.success('Strategy updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete
export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success('Strategy deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Action (POST without body)
export function useStartStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.startStrategy(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['strategies', id] });
      toast.success('Strategy started');
    },
  });
}
```

## Query Key Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `[resource]` | `['strategies']` | List all |
| `[resource, id]` | `['strategies', '123']` | Single item |
| `[resource, filters]` | `['strategies', { status: 'active' }]` | Filtered list |
| `[resource, id, nested]` | `['strategies', '123', 'orders']` | Nested resource |

## API Method Patterns

```typescript
export const api = {
  // GET list
  getStrategies: (filters?: StrategyFilters) =>
    fetchApi<Strategy[]>(`/api/v1/strategies${toQueryString(filters)}`),

  // GET single
  getStrategy: (id: string) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}`),

  // POST create
  createStrategy: (data: StrategyCreate) =>
    fetchApi<Strategy>('/api/v1/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // PUT update
  updateStrategy: (id: string, data: StrategyUpdate) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // DELETE
  deleteStrategy: (id: string) =>
    fetchApi<void>(`/api/v1/strategies/${id}`, {
      method: 'DELETE',
    }),

  // POST action
  startStrategy: (id: string) =>
    fetchApi<Strategy>(`/api/v1/strategies/${id}/start`, {
      method: 'POST',
    }),
};

// Helper for query strings
function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}
```

## Checklist

- [ ] TypeScript interfaces match backend response shape
- [ ] snake_case transformed to camelCase
- [ ] API method added to `api` object
- [ ] Hook uses correct query key pattern
- [ ] Mutations invalidate relevant queries
- [ ] Toast notifications for user feedback
- [ ] Error handling in onError callback
