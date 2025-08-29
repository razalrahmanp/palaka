# Quote and Sales Order Status Management

## Overview
This document outlines the quote generation and sales order creation workflow with proper status management.

## Workflow

### 1. Quote Generation
- **Button State**: Initially enabled when customer and items are present
- **Action**: Click "Generate Quote"
- **Process**: 
  - Reset any previous quote status
  - Create new quote with status "draft"
  - Set `quoteGenerated` to true
  - Set `quoteStatus` to "draft"
- **Result**: 
  - "Generate Quote" button becomes disabled and shows "Quote Generated"
  - Quote status indicator shows "Quote Status: Draft"
  - "Create Sales Order" button becomes enabled

### 2. Sales Order Creation
- **Button State**: Enabled only after quote is generated and not yet converted
- **Action**: Click "Create Sales Order"
- **Process**:
  - Create sales order with quote_id reference
  - Update quote status from "draft" to "converted" via PATCH API
  - Set `quoteStatus` to "converted"
- **Result**:
  - "Create Sales Order" button becomes disabled and shows "Sales Order Created"
  - Quote status indicator shows "Quote Status: Converted to Sales Order"

### 3. New Quote Generation (After Conversion)
- **Button State**: "Generate Quote" becomes enabled again for new transactions
- **Action**: Click "Generate Quote" (for new transaction)
- **Process**:
  - Reset previous quote state
  - Follow standard quote generation process
- **Result**: Fresh quote generation cycle begins

## Button States Summary

| State | Generate Quote Button | Create Sales Order Button |
|-------|----------------------|---------------------------|
| Initial | Enabled: "Generate Quote" | Disabled |
| Quote Generated | Disabled: "Quote Generated" | Enabled: "Create Sales Order" |
| Sales Order Created | Disabled: "Quote Generated" | Disabled: "Sales Order Created" |

## Status Indicators

### Quote Status Badge
- **Draft**: Blue badge showing "Quote Status: Draft"
- **Converted**: Green badge showing "Quote Status: Converted to Sales Order"
- **Hidden**: When no quote is generated

## API Endpoints

### Quote Creation
- **POST** `/api/sales/quotes`
- Sets status to "draft"

### Quote Status Update
- **PATCH** `/api/sales/quotes/[id]`
- Updates status to "converted"

### Sales Order Creation
- **POST** `/api/sales/orders`
- Links to quote via quote_id
- Triggers quote status update

## Database Schema

### Quotes Table
- `status`: enum ('draft', 'converted', 'expired')
- `id`: UUID primary key

### Sales Orders Table
- `quote_id`: UUID foreign key (optional)
- `status`: enum ('draft', 'confirmed', 'shipped', 'delivered')

## Error Handling
- Quote generation failure: Maintains previous state
- Sales order creation failure: Quote remains in draft state
- Quote status update failure: Sales order created but quote status update logged as error

## Testing Checklist
- [ ] Generate quote button disabled after quote creation
- [ ] Sales order button enabled after quote generation
- [ ] Sales order button disabled after sales order creation
- [ ] Quote status indicator shows correct status
- [ ] Quote status updated in database when sales order created
- [ ] New quote generation resets previous state
- [ ] Proper error handling for all API calls
