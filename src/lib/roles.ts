import { Permission, UserRole } from '@/types';

export const ROLES: Record<UserRole, Permission[]> = {
    "System Administrator": [
        'user:manage',
        'customer:create', 'customer:read', 'customer:update', 'customer:delete',
        'product:create', 'product:read', 'product:update', 'product:delete',
        'inventory:read', 'inventory:update',
        'sales_order:create', 'sales_order:read', 'sales_order:approve',
        'purchase_order:create', 'purchase_order:read', 'purchase_order:approve',
        'bom:manage',
        'work_order:create', 'work_order:update',
        'delivery:create', 'delivery:assign', 'delivery:read', 'delivery:update_status',
        'invoice:create', 'payment:manage',
        'employee:manage',
        'salary:manage',
        'performance_review:create', 'performance_review:read', 'performance:manage',
        'analytics:read', 'dashboard:read', 'report:read'
    ],
    "Executive": [
        'customer:read', 'product:read', 'inventory:read', 'sales_order:read',
        'purchase_order:read', 'delivery:read', 'invoice:create', 'payment:manage',
        'analytics:read', 'dashboard:read', 'report:read', 'employee:manage', 'performance_review:read'
    ],
    "Sales Manager": [
        'customer:create', 'customer:read', 'customer:update',
        'sales_order:create', 'sales_order:read', 'sales_order:approve',
        'inventory:read', 'analytics:read'
    ],
    "Sales Representative": [
        'customer:create', 'customer:read_own', 'customer:update_own',
        'sales_order:create', 'sales_order:read_own',
        'inventory:read',
        'dashboard:read',
        'analytics:read',
    ],
    "Procurement Manager": [
        'product:create', 'product:read', 'product:update', 'product:delete',
        'purchase_order:create', 'purchase_order:read', 'purchase_order:approve',
        'inventory:read'
    ],
    "Warehouse Manager": [
        'inventory:read', 'inventory:update',
        'purchase_order:read', 'sales_order:read'
    ],
    "Warehouse Staff": [
        'inventory:update'
    ],
    "Production Manager": [
        'bom:manage', 'work_order:create', 'work_order:update',
        'product:read', 'inventory:read'
    ],
    "Production Staff": [
        'work_order:update'
    ],
    "Logistics Coordinator": [
        'delivery:create', 'delivery:assign', 'delivery:read'
    ],
    "Delivery Driver": [
        'delivery:read_own', 'delivery:update_status'
    ],
    "Finance Manager": [
        'invoice:create', 'payment:manage', 'report:read',
        'sales_order:read', 'purchase_order:read'
    ],
    "HR Manager": [
        'employee:manage',
        'salary:manage',
        'performance_review:create',
        'performance_review:read',
        'performance:manage',
        'dashboard:read'
    ],
    "Employee": [
        'employee:read_own',
        'employee:update_own',
        'salary:read_own',
        'performance_review:update'
    ],
    HR: []
};
