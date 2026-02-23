# Backend Implementation (Ready)

The backend has been updated to support SaaS Admin Companies management.

## Changes:
1.  **New Model**: `database/models/company-user.model.js` (Pivot table `company_users`).
2.  **Updated Associations**: `database/models/index.js` now relates `Company` and `User` via `CompanyUser`.
3.  **Updated Service**: `services/saas/saas.service.js`
    - Added `createCompany`: Creates Company, Owner in `company_users`, Default Warehouse, Default Config.
    - Updated `getAllCompanies`: Returns list with `ownerName` and supports filtering.
    - Updated `signup`: Also creates `CompanyUser` record.
4.  **Updated Router**: `routes/saas/saas.router.js`
    - `POST /api/v1/saas/companies`: Create new company (SuperAdmin).
    - `GET /api/v1/saas/companies`: List companies (SuperAdmin).
    - `PATCH /api/v1/saas/companies/:id/status`: Suspend/Activate (SuperAdmin).
5.  **New Schema**: `schemas/saas/company.schema.js` for validation.

## Frontend Integration Guide

Since the frontend repository is not accessible in this workspace, please apply the following changes to your frontend:

### 1. API Service
Create or update `services/saas/saasCompanies.service.js`:

```javascript
import ApiService from '../ApiService';

export async function apiGetSaasCompanies(params) {
    return ApiService.fetchData({
        url: '/saas/companies',
        method: 'get',
        params
    });
}

export async function apiCreateSaasCompany(data) {
    return ApiService.fetchData({
        url: '/saas/companies',
        method: 'post',
        data
    });
}

export async function apiUpdateSaasCompanyStatus(id, status) {
    return ApiService.fetchData({
        url: `/saas/companies/${id}/status`,
        method: 'patch',
        data: { status }
    });
}
```

### 2. Companies List Component
In your Companies list View:
- Call `apiGetSaasCompanies({ page, limit, search })`.
- Display columns: Name, Slug, Plan, Seats, Owner (ownerName), Status.
- Status Badge: Green for 'active', Red for 'suspended'.
- Actions: 'Suspender' calls `apiUpdateSaasCompanyStatus(id, 'suspended')`.

### 3. Create Company Form
Fields:
- `name` (required)
- `slug` (optional/auto-generated)
- `ownerUserId` (Use a Select with async search for Users, or a simple input ID for MVP).
- `plan` (Select: basic, pro, enterprise)
- `seats` (Number)

On Submit:
- Call `apiCreateSaasCompany(formData)`.
- On success: Show toast, close modal, refresh list.

## Testing Steps
1.  **Backend**: Start server (`npm run dev`).
2.  **Frontend**:
    - Login as SuperAdmin (Tenant ID 1).
    - Navigate to `/saas/companies`.
    - creating a company -> Verify in DB `companies` table and `company_users` table.
    - Suspend -> Verify status change.

### 4. Search Users for Owner Selection (New)
To select an existing user as "Owner" in the Create Company form:

- **Endpoint**: `GET /api/v1/saas/users?search=...`
- **Frontend Service**:
```javascript
export async function apiGetSaasUsers(params) {
    return ApiService.fetchData({
        url: '/saas/users',
        method: 'get',
        params
    });
}
```
- **UI Component**: Use an Async Select component (like `react-select/async` or Elstar's Select with search).
    - Label: `username` (or email)
    - Value: `id`
    - Pass this `id` as `ownerUserId` to the create company API.
