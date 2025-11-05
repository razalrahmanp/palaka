[
  {
    "trigger_name": "trigger_update_asset_on_disposal",
    "table_name": "asset_disposals",
    "event_type": "INSERT",
    "function_name": "update_asset_on_disposal",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_assets_updated_at",
    "table_name": "assets",
    "event_type": "UPDATE",
    "function_name": "update_asset_timestamp",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "attendance_calculate_hours",
    "table_name": "attendance_records",
    "event_type": "INSERT",
    "function_name": "calculate_work_hours",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "attendance_calculate_hours",
    "table_name": "attendance_records",
    "event_type": "UPDATE",
    "function_name": "calculate_work_hours",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event_type": "DELETE",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "enabled": "D",
    "description": null
  },
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event_type": "UPDATE",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "enabled": "D",
    "description": null
  },
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event_type": "INSERT",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "enabled": "D",
    "description": null
  },
  {
    "trigger_name": "trg_calculate_bank_transaction_balance",
    "table_name": "bank_transactions",
    "event_type": "UPDATE",
    "function_name": "calculate_bank_transaction_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_calculate_bank_transaction_balance",
    "table_name": "bank_transactions",
    "event_type": "INSERT",
    "function_name": "calculate_bank_transaction_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_recalculate_after_delete",
    "table_name": "bank_transactions",
    "event_type": "DELETE",
    "function_name": "calculate_bank_transaction_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_update_bank_account_balance",
    "table_name": "bank_transactions",
    "event_type": "DELETE",
    "function_name": "update_bank_account_balance_from_transaction",
    "enabled": "O",
    "description": "Automatically updates bank_accounts.current_balance when transactions are added, modified, or deleted. Deposits add to balance, withdrawals subtract from balance."
  },
  {
    "trigger_name": "trg_update_bank_account_balance",
    "table_name": "bank_transactions",
    "event_type": "INSERT",
    "function_name": "update_bank_account_balance_from_transaction",
    "enabled": "O",
    "description": "Automatically updates bank_accounts.current_balance when transactions are added, modified, or deleted. Deposits add to balance, withdrawals subtract from balance."
  },
  {
    "trigger_name": "trg_update_bank_account_balance",
    "table_name": "bank_transactions",
    "event_type": "UPDATE",
    "function_name": "update_bank_account_balance_from_transaction",
    "enabled": "O",
    "description": "Automatically updates bank_accounts.current_balance when transactions are added, modified, or deleted. Deposits add to balance, withdrawals subtract from balance."
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "table_name": "buckets",
    "event_type": "INSERT",
    "function_name": "enforce_bucket_name_length",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "table_name": "buckets",
    "event_type": "UPDATE",
    "function_name": "enforce_bucket_name_length",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_cash_transactions_balance_update",
    "table_name": "cash_transactions",
    "event_type": "DELETE",
    "function_name": "update_cash_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_cash_transactions_balance_update",
    "table_name": "cash_transactions",
    "event_type": "INSERT",
    "function_name": "update_cash_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event_type": "INSERT",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event_type": "UPDATE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event_type": "DELETE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "table_name": "chart_of_accounts",
    "event_type": "INSERT",
    "function_name": "trigger_create_opening_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "table_name": "chart_of_accounts",
    "event_type": "UPDATE",
    "function_name": "trigger_create_opening_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_chart_of_accounts_timestamp",
    "table_name": "chart_of_accounts",
    "event_type": "UPDATE",
    "function_name": "trigger_update_timestamp",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "chat_room_last_message_trigger",
    "table_name": "chat_messages",
    "event_type": "UPDATE",
    "function_name": "update_chat_room_last_message",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "chat_room_last_message_trigger",
    "table_name": "chat_messages",
    "event_type": "INSERT",
    "function_name": "update_chat_room_last_message",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_create_message_notifications",
    "table_name": "chat_messages",
    "event_type": "INSERT",
    "function_name": "create_message_notifications",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event_type": "UPDATE",
    "function_name": "update_chat_room_participant_count",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event_type": "INSERT",
    "function_name": "update_chat_room_participant_count",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event_type": "DELETE",
    "function_name": "update_chat_room_participant_count",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_add_creator_as_participant",
    "table_name": "chat_rooms",
    "event_type": "INSERT",
    "function_name": "add_creator_as_participant",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_chat_rooms_updated_at",
    "table_name": "chat_rooms",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "calculate_cost_price_trigger",
    "table_name": "custom_products",
    "event_type": "INSERT",
    "function_name": "calculate_custom_product_cost_price",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "calculate_cost_price_trigger",
    "table_name": "custom_products",
    "event_type": "UPDATE",
    "function_name": "calculate_custom_product_cost_price",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_customers_set_updated_at",
    "table_name": "customers",
    "event_type": "UPDATE",
    "function_name": "set_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_customers_updated_at",
    "table_name": "customers",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event_type": "DELETE",
    "function_name": "update_route_efficiency",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event_type": "INSERT",
    "function_name": "update_route_efficiency",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event_type": "UPDATE",
    "function_name": "update_route_efficiency",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event_type": "INSERT",
    "function_name": "update_delivery_status_from_items",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event_type": "UPDATE",
    "function_name": "update_delivery_status_from_items",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event_type": "DELETE",
    "function_name": "update_delivery_status_from_items",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_sales_order_delivery_status",
    "table_name": "delivery_items",
    "event_type": "UPDATE",
    "function_name": "update_sales_order_delivery_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_expenses_updated_at",
    "table_name": "expenses",
    "event_type": "UPDATE",
    "function_name": "update_expenses_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event_type": "INSERT",
    "function_name": "trigger_update_account_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event_type": "UPDATE",
    "function_name": "trigger_update_account_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event_type": "DELETE",
    "function_name": "trigger_update_account_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_general_ledger_validate_account",
    "table_name": "general_ledger",
    "event_type": "INSERT",
    "function_name": "trigger_validate_account_usage",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_general_ledger_validate_account",
    "table_name": "general_ledger",
    "event_type": "UPDATE",
    "function_name": "trigger_validate_account_usage",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_account_balance",
    "table_name": "general_ledger",
    "event_type": "DELETE",
    "function_name": "update_account_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_account_balance",
    "table_name": "general_ledger",
    "event_type": "INSERT",
    "function_name": "update_account_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_investments_modtime",
    "table_name": "investments",
    "event_type": "UPDATE",
    "function_name": "update_modified_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_invoice_refund_totals",
    "table_name": "invoice_refunds",
    "event_type": "UPDATE",
    "function_name": "update_invoice_refund_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_invoice_refund_totals",
    "table_name": "invoice_refunds",
    "event_type": "INSERT",
    "function_name": "update_invoice_refund_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_invoices_create_journal",
    "table_name": "invoices",
    "event_type": "INSERT",
    "function_name": "trigger_create_sales_journal_entry",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "table_name": "invoices",
    "event_type": "UPDATE",
    "function_name": "update_customer_status_from_invoice",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "table_name": "invoices",
    "event_type": "DELETE",
    "function_name": "update_customer_status_from_invoice",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "table_name": "invoices",
    "event_type": "INSERT",
    "function_name": "update_customer_status_from_invoice",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event_type": "INSERT",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event_type": "DELETE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event_type": "UPDATE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_journal_entries_timestamp",
    "table_name": "journal_entries",
    "event_type": "UPDATE",
    "function_name": "trigger_update_timestamp",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_journal_entries_validate_balance",
    "table_name": "journal_entries",
    "event_type": "UPDATE",
    "function_name": "trigger_validate_journal_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_create_gl_entries",
    "table_name": "journal_entries",
    "event_type": "UPDATE",
    "function_name": "create_general_ledger_entries",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_journal_entries_updated_at",
    "table_name": "journal_entries",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event_type": "DELETE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event_type": "INSERT",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event_type": "UPDATE",
    "function_name": "create_audit_trail",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event_type": "DELETE",
    "function_name": "trigger_update_journal_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event_type": "UPDATE",
    "function_name": "trigger_update_journal_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event_type": "INSERT",
    "function_name": "trigger_update_journal_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_journal_entry_lines_updated_at",
    "table_name": "journal_entry_lines",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_liability_payments_updated_at",
    "table_name": "liability_payments",
    "event_type": "UPDATE",
    "function_name": "update_liability_payments_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_loan_balance_on_payment",
    "table_name": "liability_payments",
    "event_type": "INSERT",
    "function_name": "update_loan_current_balance",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_loan_opening_balances_updated_at",
    "table_name": "loan_opening_balances",
    "event_type": "UPDATE",
    "function_name": "update_loan_opening_balances_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_lead_timestamp",
    "table_name": "meta_ads_leads",
    "event_type": "UPDATE",
    "function_name": "update_lead_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "objects_delete_delete_prefix",
    "table_name": "objects",
    "event_type": "DELETE",
    "function_name": "delete_prefix_hierarchy_trigger",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "objects_insert_create_prefix",
    "table_name": "objects",
    "event_type": "INSERT",
    "function_name": "objects_insert_prefix_trigger",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "objects_update_create_prefix",
    "table_name": "objects",
    "event_type": "UPDATE",
    "function_name": "objects_update_prefix_trigger",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_objects_updated_at",
    "table_name": "objects",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_opening_stock_timestamp",
    "table_name": "opening_stock_snapshots",
    "event_type": "UPDATE",
    "function_name": "update_opening_stock_timestamp",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_partners_modtime",
    "table_name": "partners",
    "event_type": "UPDATE",
    "function_name": "update_modified_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "prefixes_create_hierarchy",
    "table_name": "prefixes",
    "event_type": "INSERT",
    "function_name": "prefixes_insert_trigger",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "prefixes_delete_hierarchy",
    "table_name": "prefixes",
    "event_type": "DELETE",
    "function_name": "delete_prefix_hierarchy_trigger",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_products_set_updated_at",
    "table_name": "products",
    "event_type": "UPDATE",
    "function_name": "set_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_products_updated_at",
    "table_name": "products",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_purchase_order_items_updated_at",
    "table_name": "purchase_order_items",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_purchase_orders_create_journal",
    "table_name": "purchase_orders",
    "event_type": "INSERT",
    "function_name": "trigger_create_purchase_journal_entry",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_purchase_return_totals",
    "table_name": "purchase_return_line_items",
    "event_type": "DELETE",
    "function_name": "update_purchase_return_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_purchase_return_totals",
    "table_name": "purchase_return_line_items",
    "event_type": "INSERT",
    "function_name": "update_purchase_return_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_purchase_return_totals",
    "table_name": "purchase_return_line_items",
    "event_type": "UPDATE",
    "function_name": "update_purchase_return_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "table_name": "purchase_returns",
    "event_type": "INSERT",
    "function_name": "update_vendor_bill_return_tracking",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "table_name": "purchase_returns",
    "event_type": "DELETE",
    "function_name": "update_vendor_bill_return_tracking",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "table_name": "purchase_returns",
    "event_type": "UPDATE",
    "function_name": "update_vendor_bill_return_tracking",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_validate_return_creation",
    "table_name": "returns",
    "event_type": "UPDATE",
    "function_name": "validate_return_creation",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_validate_return_creation",
    "table_name": "returns",
    "event_type": "INSERT",
    "function_name": "validate_return_creation",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_role_access_config_updated_at",
    "table_name": "role_access_config",
    "event_type": "UPDATE",
    "function_name": "update_role_access_config_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "table_name": "sales_order_items",
    "event_type": "INSERT",
    "function_name": "calculate_sales_order_item_tax",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "table_name": "sales_order_items",
    "event_type": "UPDATE",
    "function_name": "calculate_sales_order_item_tax",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_sales_order_item_totals_delete",
    "table_name": "sales_order_items",
    "event_type": "DELETE",
    "function_name": "update_sales_order_item_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_sales_order_item_totals_insert",
    "table_name": "sales_order_items",
    "event_type": "INSERT",
    "function_name": "update_sales_order_item_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_sales_order_item_totals_update",
    "table_name": "sales_order_items",
    "event_type": "UPDATE",
    "function_name": "update_sales_order_item_totals",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event_type": "UPDATE",
    "function_name": "trigger_analytics_update",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event_type": "INSERT",
    "function_name": "trigger_analytics_update",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event_type": "DELETE",
    "function_name": "trigger_analytics_update",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_sales_orders_create_journal",
    "table_name": "sales_orders",
    "event_type": "INSERT",
    "function_name": "trigger_create_sales_journal_entry",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_sales_orders_set_updated_at",
    "table_name": "sales_orders",
    "event_type": "UPDATE",
    "function_name": "set_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_sales_orders_updated_at",
    "table_name": "sales_orders",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_customer_status_on_order",
    "table_name": "sales_orders",
    "event_type": "INSERT",
    "function_name": "update_customer_status_from_sales_order",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "apply_stock_adjustment_trigger",
    "table_name": "stock_adjustments",
    "event_type": "INSERT",
    "function_name": "apply_stock_adjustment",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "stock_adjustments_updated_at_trigger",
    "table_name": "stock_adjustments",
    "event_type": "UPDATE",
    "function_name": "update_stock_adjustments_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "event_type": "INSERT",
    "function_name": "subscription_check_filters",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "event_type": "UPDATE",
    "function_name": "subscription_check_filters",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_suppliers_set_updated_at",
    "table_name": "suppliers",
    "event_type": "UPDATE",
    "function_name": "set_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_suppliers_updated_at",
    "table_name": "suppliers",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_support_tickets_updated_at",
    "table_name": "support_tickets",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_user_notification_settings_updated_at",
    "table_name": "user_notification_settings",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_vendor_bill_line_items_updated_at",
    "table_name": "vendor_bill_line_items",
    "event_type": "UPDATE",
    "function_name": "update_vendor_bill_line_items_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_vendor_payments_create_journal",
    "table_name": "vendor_payment_history",
    "event_type": "INSERT",
    "function_name": "trigger_create_vendor_payment_journal_entry",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event_type": "DELETE",
    "function_name": "trigger_update_po_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event_type": "INSERT",
    "function_name": "trigger_update_po_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event_type": "UPDATE",
    "function_name": "trigger_update_po_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event_type": "INSERT",
    "function_name": "update_purchase_order_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event_type": "DELETE",
    "function_name": "update_purchase_order_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event_type": "UPDATE",
    "function_name": "update_purchase_order_payment_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event_type": "INSERT",
    "function_name": "update_vendor_bill_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event_type": "UPDATE",
    "function_name": "update_vendor_bill_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event_type": "DELETE",
    "function_name": "update_vendor_bill_status",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "update_withdrawals_modtime",
    "table_name": "withdrawals",
    "event_type": "UPDATE",
    "function_name": "update_modified_column",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_work_orders_set_updated_at",
    "table_name": "work_orders",
    "event_type": "UPDATE",
    "function_name": "set_updated_at",
    "enabled": "O",
    "description": null
  },
  {
    "trigger_name": "trg_work_orders_updated_at",
    "table_name": "work_orders",
    "event_type": "UPDATE",
    "function_name": "update_updated_at_column",
    "enabled": "O",
    "description": null
  }
]