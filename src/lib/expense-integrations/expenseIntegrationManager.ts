// lib/expense-integrations/expenseIntegrationManager.ts
import { 
  createVendorPaymentIntegration,
  VendorPaymentParams 
} from "./vendorPaymentIntegration";
import { 
  createEmployeePaymentIntegration,
  EmployeePaymentParams 
} from "./employeePaymentIntegration";
import { 
  createVehicleExpenseIntegration,
  VehicleExpenseParams 
} from "./vehicleExpenseIntegration";

export interface EntityExpenseParams {
  expenseId: string;
  amount: number;
  date: string;
  category: string;
  subcategory: string;
  description: string;
  paymentMethod: string;
  bankAccountId?: string;
  createdBy: string;
  entityType?: 'truck' | 'employee' | 'supplier';
  entityId?: string;
  // Additional context for specific integrations
  vendorBillId?: string;
  payrollRecordId?: string;
  odometer?: number;
  quantity?: number;
  location?: string;
  vendorName?: string;
  receiptNumber?: string;
}

export interface ExpenseIntegrationResult {
  success: boolean;
  error?: string;
  integrations: {
    vendor?: boolean;
    employee?: boolean;
    vehicle?: boolean;
  };
  details?: {
    vendorPaymentId?: string;
    payrollUpdateId?: string;
    vehicleExpenseId?: string;
  };
}

/**
 * Determines the entity type based on expense category/subcategory
 */
export function getEntityTypeFromCategory(category: string, subcategory: string): 'truck' | 'employee' | 'supplier' | null {
  // Vehicle-related categories
  const vehicleCategories = [
    'Vehicle Fuel - Fleet',
    'Vehicle Maintenance - Fleet',
    'Vehicle Insurance',
    'Vehicle Registration',
    'Logistics & Distribution',
    'Vehicle Fleet'
  ];

  // Employee-related categories
  const employeeCategories = [
    'Salaries & Benefits',
    'Salary - Management',
    'Salary - Production',
    'Salary - Sales',
    'Salary - Administration',
    'Bonus - Performance',
    'Bonus - Festival',
    'Allowance - Travel',
    'Allowance - Medical',
    'Overtime Payment',
    'Incentive Pay'
  ];

  // Vendor/Supplier-related categories
  const vendorCategories = [
    'Vendor Payment',
    'Supplier Payment',
    'Accounts Payable',
    'Raw Materials',
    'Office Supplies',
    'Marketing & Sales',
    'Technology',
    'Insurance',
    'Maintenance & Repairs',
    'Utilities'
  ];

  if (vehicleCategories.some(cat => subcategory.includes(cat) || category.includes(cat))) {
    return 'truck';
  }

  if (employeeCategories.some(cat => subcategory.includes(cat) || category.includes(cat))) {
    return 'employee';
  }

  if (vendorCategories.some(cat => subcategory.includes(cat) || category.includes(cat))) {
    return 'supplier';
  }

  return null;
}

/**
 * Determines the expense/payment type based on subcategory
 */
export function getExpenseTypeFromSubcategory(subcategory: string): string {
  // Vehicle expense types
  if (subcategory.includes('Fuel')) return 'fuel';
  if (subcategory.includes('Maintenance')) return 'maintenance';
  if (subcategory.includes('Insurance')) return 'insurance';
  if (subcategory.includes('Registration')) return 'registration';
  if (subcategory.includes('Repair')) return 'repair';

  // Employee payment types
  if (subcategory.includes('Salary')) return 'salary';
  if (subcategory.includes('Bonus')) return 'bonus';
  if (subcategory.includes('Allowance')) return 'allowance';
  if (subcategory.includes('Overtime')) return 'overtime';
  if (subcategory.includes('Incentive')) return 'incentive';

  // Default
  return 'other';
}

/**
 * Main expense integration orchestrator
 */
export async function processExpenseIntegration(params: EntityExpenseParams): Promise<ExpenseIntegrationResult> {
  const {
    expenseId,
    amount,
    date,
    category,
    subcategory,
    description,
    paymentMethod,
    bankAccountId,
    createdBy,
    entityType,
    entityId
  } = params;

  try {
    console.log('🔄 Processing expense integration for:', expenseId);
    console.log('Category:', category, 'Subcategory:', subcategory);
    console.log('Entity:', entityType, entityId);

    const result: ExpenseIntegrationResult = {
      success: true,
      integrations: {},
      details: {}
    };

    // Determine entity type if not provided
    const finalEntityType = entityType || getEntityTypeFromCategory(category, subcategory);
    console.log('Final entity type:', finalEntityType);

    if (!finalEntityType || !entityId) {
      console.log('No entity integration required');
      return result;
    }

    // Process based on entity type
    switch (finalEntityType) {
      case 'supplier': {
        const vendorParams: VendorPaymentParams = {
          expenseId,
          supplierId: entityId,
          amount,
          paymentDate: date,
          paymentMethod,
          bankAccountId,
          description,
          createdBy,
          vendorBillId: params.vendorBillId
        };

        const vendorResult = await createVendorPaymentIntegration(vendorParams);
        result.integrations.vendor = vendorResult.success;
        
        if (vendorResult.success) {
          if (!result.details) result.details = {};
          result.details.vendorPaymentId = vendorResult.vendorPaymentId;
          console.log('✅ Vendor payment integration completed');
        } else {
          console.error('❌ Vendor payment integration failed:', vendorResult.error);
          result.success = false;
          result.error = vendorResult.error;
        }
        break;
      }

      case 'employee': {
        const paymentType = getExpenseTypeFromSubcategory(subcategory) as 'salary' | 'bonus' | 'allowance' | 'overtime' | 'incentive' | 'reimbursement';
        
        const employeeParams: EmployeePaymentParams = {
          expenseId,
          employeeId: entityId,
          amount,
          paymentDate: date,
          paymentMethod,
          bankAccountId,
          description,
          createdBy,
          paymentType,
          payrollRecordId: params.payrollRecordId
        };

        const employeeResult = await createEmployeePaymentIntegration(employeeParams);
        result.integrations.employee = employeeResult.success;
        
        if (employeeResult.success) {
          if (!result.details) result.details = {};
          result.details.payrollUpdateId = employeeResult.payrollUpdateId || employeeResult.bonusRecordId;
          console.log('✅ Employee payment integration completed');
        } else {
          console.error('❌ Employee payment integration failed:', employeeResult.error);
          result.success = false;
          result.error = employeeResult.error;
        }
        break;
      }

      case 'truck': {
        const expenseType = getExpenseTypeFromSubcategory(subcategory) as 'fuel' | 'maintenance' | 'insurance' | 'registration' | 'repair' | 'other';
        
        const vehicleParams: VehicleExpenseParams = {
          expenseId,
          truckId: entityId,
          amount,
          expenseDate: date,
          description,
          createdBy,
          expenseType,
          odometer: params.odometer,
          quantity: params.quantity,
          location: params.location,
          vendorName: params.vendorName,
          receiptNumber: params.receiptNumber
        };

        const vehicleResult = await createVehicleExpenseIntegration(vehicleParams);
        result.integrations.vehicle = vehicleResult.success;
        
        if (vehicleResult.success) {
          if (!result.details) result.details = {};
          result.details.vehicleExpenseId = vehicleResult.vehicleExpenseId;
          console.log('✅ Vehicle expense integration completed');
        } else {
          console.error('❌ Vehicle expense integration failed:', vehicleResult.error);
          result.success = false;
          result.error = vehicleResult.error;
        }
        break;
      }

      default:
        console.log('No specific integration handler for entity type:', finalEntityType);
        break;
    }

    return result;

  } catch (error) {
    console.error('Error in expense integration processing:', error);
    return {
      success: false,
      error: 'Failed to process expense integration',
      integrations: {}
    };
  }
}

/**
 * Validates expense integration requirements
 */
export function validateExpenseIntegration(params: EntityExpenseParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.expenseId) errors.push('Expense ID is required');
  if (!params.amount || params.amount <= 0) errors.push('Valid amount is required');
  if (!params.date) errors.push('Date is required');
  if (!params.description) errors.push('Description is required');
  if (!params.createdBy) errors.push('Created by user ID is required');

  // Entity-specific validations
  if (params.entityType && !params.entityId) {
    errors.push('Entity ID is required when entity type is specified');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
