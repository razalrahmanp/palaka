# Role Access Settings Feature

## Overview
A dynamic role-based access control system that allows System Administrators to configure which routes and modules each role can access through a user-friendly settings interface.

## Features

### 1. Settings Page (System Administrator Only)
- **Location**: `/settings` (accessible only to System Administrator)
- **Purpose**: Configure route access for all roles except System Administrator
- **Features**:
  - Select role from dropdown (15 configurable roles)
  - View all available routes grouped by module
  - Check/uncheck routes to grant/revoke access
  - Quick actions: Select All / Deselect All
  - Real-time access summary display
  - Save configuration to database

### 2. Database Storage
- **Table**: `role_access_config`
- **Columns**:
  - `id` (UUID, Primary Key)
  - `role` (TEXT, UNIQUE)
  - `accessible_routes` (TEXT[]) - Array of route paths
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### 3. Default Configurations
Pre-populated access configurations for all roles:
- **Auditor**: Full access to all modules (same as System Admin)
- **Executive**: Access to most modules except warehouse operations
- **Sales Manager/Representative**: Sales module only
- **Procurement Manager**: Procurement + limited Inventory
- **Warehouse Manager/Staff**: Inventory management
- **Production Manager/Staff**: Manufacturing + Inventory
- **Logistics Coordinator/Delivery Driver**: Logistics module
- **Finance Manager**: Finance + Sales + Procurement views
- **HR Manager/HR**: HR module
- **Employee**: Dashboard only

## File Structure

```
src/
├── app/
│   ├── (erp)/
│   │   └── settings/
│   │       └── page.tsx          # Settings UI
│   └── api/
│       └── settings/
│           └── role-access/
│               └── route.ts       # API endpoints
├── lib/
│   └── rbac.ts                    # Updated with dynamic helpers
└── database/
    └── role_access_config.sql     # Table schema
```

## API Endpoints

### GET /api/settings/role-access
Fetch all role access configurations
- **Auth**: Required
- **Response**: Array of `{ role: string, accessibleRoutes: string[] }`

### POST /api/settings/role-access
Update role access configuration
- **Auth**: System Administrator only
- **Body**: `{ role: string, accessibleRoutes: string[] }`
- **Response**: Success message with updated data

## Helper Functions

### `hasRouteAccessFromDB(roleName: string, routePath: string): Promise<boolean>`
Check if a role has access to a specific route based on database configuration.
- Falls back to code-based RBAC if database query fails
- Checks exact match and parent route matches

### `getDynamicSidebarForRole(roleName: string): Promise<SidebarConfig>`
Get filtered sidebar navigation based on database configuration.
- System Administrator always gets full access
- Filters navigation items based on accessible routes
- Falls back to code-based config on error

## Usage

### 1. Setup Database
Run the SQL script to create the table and insert default configurations:
```sql
-- Run in Supabase SQL Editor
-- File: database/role_access_config.sql
```

### 2. Access Settings (as System Administrator)
1. Log in as System Administrator
2. Navigate to Settings in the sidebar
3. Select a role from the dropdown
4. Check/uncheck routes to configure access
5. Click "Save Configuration"

### 3. Verify Changes
- Log in as the configured role
- Sidebar will automatically reflect the new access configuration
- Attempting to access restricted routes will be denied

## Security Features

### Authentication & Authorization
- Settings page accessible only to System Administrator
- API endpoints verify user authentication
- Role validation before allowing configuration changes
- System Administrator role cannot be modified

### Fallback Mechanism
- If database query fails, falls back to code-based RBAC
- Ensures system remains functional even with DB issues
- Code-based configuration as source of truth

### Audit Trail
- `created_at` and `updated_at` timestamps
- Automatic timestamp updates via database trigger

## Available Routes

### Modules & Routes
1. **Dashboard**: `/dashboard`
2. **Sales**: `/sales`, `/sales/customers`, `/sales/orders`, `/sales/quotes`
3. **Inventory**: `/inventory`, `/inventory/products`, `/inventory/stock`, `/inventory/adjustments`
4. **Manufacturing**: `/manufacturing`, `/manufacturing/bom`, `/manufacturing/work-orders`
5. **Logistics**: `/logistics`, `/logistics/deliveries`, `/logistics/vehicles`
6. **Procurement**: `/procurement`, `/procurement/purchase-orders`, `/procurement/vendors`
7. **Finance**: `/finance`, `/finance/invoices`, `/finance/payments`
8. **HR**: `/hr`, `/hr/employees`, `/hr/attendance`, `/hr/payroll`, `/hr/performance`

## Implementation Notes

### Code-Based vs Database-Based
- **System Administrator**: Always uses code-based RBAC (full access)
- **Other Roles**: Database configuration takes precedence
- **Fallback**: Code-based RBAC if database unavailable

### Route Matching Logic
Routes match if:
1. Exact match: `routePath === accessibleRoute`
2. Parent match: `routePath.startsWith(accessibleRoute + '/')`

Example: If `/sales` is accessible, then `/sales/customers` is also accessible.

### Sidebar Filtering
Navigation items are filtered recursively:
1. Check if route or any child routes are accessible
2. Remove inaccessible items
3. Keep parent items if any children are accessible
4. Remove parent items with no accessible children

## Testing

### Test Scenarios
1. **Configure New Access**
   - Log in as System Admin
   - Change HR Manager to only access `/hr/employees`
   - Save and verify

2. **Verify Access Control**
   - Log in as HR Manager
   - Should only see Dashboard and HR > Employees
   - Attempting to access `/hr/payroll` should fail

3. **Test Fallback**
   - Simulate database error
   - Verify system uses code-based RBAC
   - All functionality remains intact

4. **Test Permissions**
   - Try accessing `/settings` as non-admin
   - Should be denied or hidden

## Future Enhancements

### Potential Features
1. **Permission-Level Control**: Granular read/write/delete permissions per route
2. **Bulk Configuration**: Configure multiple roles at once
3. **Configuration History**: Track changes with user and timestamp
4. **Import/Export**: JSON export/import for configurations
5. **Role Templates**: Pre-defined access templates
6. **Custom Roles**: Allow creating new roles with custom access
7. **Access Analytics**: Track which routes are most accessed per role

### Performance Optimizations
1. **Caching**: Cache role access configurations in memory
2. **Redis Integration**: Store configurations in Redis for faster access
3. **Preload on Login**: Fetch and cache user's access on authentication
4. **Lazy Loading**: Load route configurations on-demand

## Troubleshooting

### Issue: Settings page not visible
**Solution**: Ensure user is logged in as System Administrator. Check sidebar configuration in `rbac.ts`.

### Issue: Changes not reflecting
**Solution**: 
1. Verify save was successful (check API response)
2. Clear browser cache and localStorage
3. Log out and log back in
4. Check database directly for updated values

### Issue: Database errors
**Solution**: 
1. Verify table exists: Run `role_access_config.sql`
2. Check RLS policies allow authenticated users to read
3. Verify Supabase connection is active
4. Check console for specific error messages

### Issue: All roles lost access
**Solution**: 
1. System Administrator always has full access via code
2. Log in as System Admin
3. Reconfigure affected roles in Settings
4. Or reset via SQL: `DELETE FROM role_access_config WHERE role = 'RoleName'`

## Maintenance

### Regular Tasks
1. **Backup Configurations**: Export role_access_config table regularly
2. **Audit Access**: Review role access periodically
3. **Update Defaults**: Update default configurations when adding new routes
4. **Monitor Usage**: Check which routes are accessed most per role

### Adding New Routes
When adding new routes to the application:
1. Update `ALL_ROUTES` array in `settings/page.tsx`
2. Update default configurations in `role_access_config.sql`
3. Update sidebar configuration in `rbac.ts`
4. Test with multiple roles

## Summary
This feature provides System Administrators with complete control over role-based access without requiring code changes. It's secure, flexible, and maintains backward compatibility with the existing code-based RBAC system.
