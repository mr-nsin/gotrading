---
name: backend-endpoint
description: Scaffold new FastAPI endpoints with full stack integration. Use when creating new API routes, adding backend endpoints, or implementing new features that need API support. Handles route creation, models, TypeScript types, and React Query hooks.
---

# Backend Endpoint Scaffolding

You are a full-stack engineer creating new API endpoints for the GoTrading platform. Your task is to scaffold complete endpoint implementations with frontend integration.

## Workflow

When creating a new endpoint:

1. **Gather Requirements**
   - Endpoint purpose and HTTP method(s)
   - Request/response data structures
   - Database model changes needed
   - Authentication requirements

2. **Create Backend Route**
   - Add route file in `gotrading/backend/routes/` if new domain
   - Or add to existing route file if extending a domain
   - Register in `main.py` if new router

3. **Create/Update Models**
   - Pydantic DTOs for request/response
   - SQLModel table if database storage needed

4. **Create Frontend Integration**
   - Add TypeScript types to `gotrading/frontend/src/lib/api.ts`
   - Add React Query hook to `gotrading/frontend/src/hooks/use-api.ts`

## File Templates

### Route File (`routes/{domain}.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import {Model}, {ModelCreate}, {ModelResponse}

router = APIRouter(prefix="/api/v1/{domain}", tags=["{domain}"])

@router.get("/", response_model=list[{ModelResponse}])
def list_{domain}(session: Session = Depends(get_session)):
    statement = select({Model})
    return session.exec(statement).all()

@router.get("/{id}", response_model={ModelResponse})
def get_{domain}(id: int, session: Session = Depends(get_session)):
    item = session.get({Model}, id)
    if not item:
        raise HTTPException(status_code=404, detail="{Model} not found")
    return item

@router.post("/", response_model={ModelResponse})
def create_{domain}(data: {ModelCreate}, session: Session = Depends(get_session)):
    item = {Model}(**data.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.put("/{id}", response_model={ModelResponse})
def update_{domain}(id: int, data: {ModelCreate}, session: Session = Depends(get_session)):
    item = session.get({Model}, id)
    if not item:
        raise HTTPException(status_code=404, detail="{Model} not found")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    session.commit()
    session.refresh(item)
    return item

@router.delete("/{id}")
def delete_{domain}(id: int, session: Session = Depends(get_session)):
    item = session.get({Model}, id)
    if not item:
        raise HTTPException(status_code=404, detail="{Model} not found")
    session.delete(item)
    session.commit()
    return {"ok": True}
```

### Model File Addition (`models.py`)

```python
from sqlmodel import SQLModel, Field
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Database Model
class {Model}(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # Add fields...
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request DTO
class {Model}Create(BaseModel):
    name: str
    # Add fields...

# Response DTO
class {Model}Response(BaseModel):
    id: int
    name: str
    created_at: datetime
    # Add fields...
```

### TypeScript Types (`lib/api.ts`)

```typescript
// Types
export interface {Model} {
  id: number;
  name: string;
  createdAt: string;
  // Add fields...
}

export interface {Model}Create {
  name: string;
  // Add fields...
}

// API Methods
export const api = {
  // ... existing methods
  
  get{Models}: () => fetchApi<{Model}[]>('/api/v1/{domain}'),
  get{Model}: (id: number) => fetchApi<{Model}>(`/api/v1/{domain}/${id}`),
  create{Model}: (data: {Model}Create) => fetchApi<{Model}>('/api/v1/{domain}', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update{Model}: (id: number, data: {Model}Create) => fetchApi<{Model}>(`/api/v1/{domain}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete{Model}: (id: number) => fetchApi<void>(`/api/v1/{domain}/${id}`, {
    method: 'DELETE',
  }),
};
```

### React Query Hooks (`hooks/use-api.ts`)

```typescript
// List hook
export function use{Models}() {
  return useQuery({
    queryKey: ['{domain}'],
    queryFn: () => api.get{Models}(),
  });
}

// Single item hook
export function use{Model}(id: number) {
  return useQuery({
    queryKey: ['{domain}', id],
    queryFn: () => api.get{Model}(id),
    enabled: !!id,
  });
}

// Create mutation
export function useCreate{Model}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {Model}Create) => api.create{Model}(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{domain}'] });
      toast.success('{Model} created');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

// Update mutation
export function useUpdate{Model}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: {Model}Create }) => 
      api.update{Model}(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['{domain}'] });
      queryClient.invalidateQueries({ queryKey: ['{domain}', id] });
      toast.success('{Model} updated');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

// Delete mutation
export function useDelete{Model}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete{Model}(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{domain}'] });
      toast.success('{Model} deleted');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
```

## Register Route in `main.py`

```python
from routes.{domain} import router as {domain}_router

app.include_router({domain}_router)
```

## Checklist

- [ ] Route file created with CRUD operations
- [ ] Models added (SQLModel + Pydantic DTOs)
- [ ] Route registered in main.py
- [ ] TypeScript types added to api.ts
- [ ] React Query hooks added to use-api.ts
- [ ] Tested endpoint with curl or frontend
