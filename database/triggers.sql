[
  {
    "table_name": "asset_disposals",
    "trigger_name": "trigger_update_asset_on_disposal",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_asset_on_disposal()",
    "created": null
  },
  {
    "table_name": "assets",
    "trigger_name": "trigger_assets_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_asset_timestamp()",
    "created": null
  },
  {
    "table_name": "attendance_records",
    "trigger_name": "attendance_calculate_hours",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION calculate_work_hours()",
    "created": null
  },
  {
    "table_name": "attendance_records",
    "trigger_name": "attendance_calculate_hours",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION calculate_work_hours()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION sync_bank_account_to_chart_of_accounts()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION sync_bank_account_to_chart_of_accounts()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION sync_bank_account_to_chart_of_accounts()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_calculate_bank_transaction_balance",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION calculate_bank_transaction_balance()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_calculate_bank_transaction_balance",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION calculate_bank_transaction_balance()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_recalculate_after_delete",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION calculate_bank_transaction_balance()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_update_bank_account_balance",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_bank_account_balance_from_transaction()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_update_bank_account_balance",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_bank_account_balance_from_transaction()",
    "created": null
  },
  {
    "table_name": "bank_transactions",
    "trigger_name": "trg_update_bank_account_balance",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_bank_account_balance_from_transaction()",
    "created": null
  },
  {
    "table_name": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "created": null
  },
  {
    "table_name": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "created": null
  },
  {
    "table_name": "cash_transactions",
    "trigger_name": "trg_cash_transactions_balance_update",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_cash_balance()",
    "created": null
  },
  {
    "table_name": "cash_transactions",
    "trigger_name": "trg_cash_transactions_balance_update",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_cash_balance()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "audit_chart_of_accounts",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "audit_chart_of_accounts",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "audit_chart_of_accounts",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_create_opening_balance()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_create_opening_balance()",
    "created": null
  },
  {
    "table_name": "chart_of_accounts",
    "trigger_name": "trg_chart_of_accounts_timestamp",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_update_timestamp()",
    "created": null
  },
  {
    "table_name": "chat_messages",
    "trigger_name": "chat_room_last_message_trigger",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_chat_room_last_message()",
    "created": null
  },
  {
    "table_name": "chat_messages",
    "trigger_name": "chat_room_last_message_trigger",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_chat_room_last_message()",
    "created": null
  },
  {
    "table_name": "chat_messages",
    "trigger_name": "trigger_create_message_notifications",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION create_message_notifications()",
    "created": null
  },
  {
    "table_name": "chat_participants",
    "trigger_name": "chat_participant_count_trigger",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_chat_room_participant_count()",
    "created": null
  },
  {
    "table_name": "chat_participants",
    "trigger_name": "chat_participant_count_trigger",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_chat_room_participant_count()",
    "created": null
  },
  {
    "table_name": "chat_participants",
    "trigger_name": "chat_participant_count_trigger",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_chat_room_participant_count()",
    "created": null
  },
  {
    "table_name": "chat_rooms",
    "trigger_name": "trigger_add_creator_as_participant",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION add_creator_as_participant()",
    "created": null
  },
  {
    "table_name": "chat_rooms",
    "trigger_name": "update_chat_rooms_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "custom_products",
    "trigger_name": "calculate_cost_price_trigger",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION calculate_custom_product_cost_price()",
    "created": null
  },
  {
    "table_name": "custom_products",
    "trigger_name": "calculate_cost_price_trigger",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION calculate_custom_product_cost_price()",
    "created": null
  },
  {
    "table_name": "customers",
    "trigger_name": "trg_customers_set_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION set_updated_at()",
    "created": null
  },
  {
    "table_name": "customers",
    "trigger_name": "trg_customers_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "deliveries",
    "trigger_name": "trigger_update_route_efficiency",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_route_efficiency()",
    "created": null
  },
  {
    "table_name": "deliveries",
    "trigger_name": "trigger_update_route_efficiency",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_route_efficiency()",
    "created": null
  },
  {
    "table_name": "deliveries",
    "trigger_name": "trigger_update_route_efficiency",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_route_efficiency()",
    "created": null
  },
  {
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_delivery_status_from_items",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_delivery_status_from_items()",
    "created": null
  },
  {
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_delivery_status_from_items",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_delivery_status_from_items()",
    "created": null
  },
  {
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_delivery_status_from_items",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_delivery_status_from_items()",
    "created": null
  },
  {
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_sales_order_delivery_status",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_sales_order_delivery_status()",
    "created": null
  },
  {
    "table_name": "expenses",
    "trigger_name": "trigger_expenses_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_expenses_updated_at()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_update_balance",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_update_account_balance()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_update_balance",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION trigger_update_account_balance()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_update_balance",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_update_account_balance()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_validate_account",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_validate_account_usage()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_validate_account",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_validate_account_usage()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trigger_update_account_balance",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_account_balance()",
    "created": null
  },
  {
    "table_name": "general_ledger",
    "trigger_name": "trigger_update_account_balance",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_account_balance()",
    "created": null
  },
  {
    "table_name": "investments",
    "trigger_name": "update_investments_modtime",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_modified_column()",
    "created": null
  },
  {
    "table_name": "invoice_refunds",
    "trigger_name": "trigger_update_invoice_refund_totals",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_invoice_refund_totals()",
    "created": null
  },
  {
    "table_name": "invoice_refunds",
    "trigger_name": "trigger_update_invoice_refund_totals",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_invoice_refund_totals()",
    "created": null
  },
  {
    "table_name": "invoices",
    "trigger_name": "trg_invoices_create_journal",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_create_sales_journal_entry()",
    "created": null
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_customer_status_from_invoice()",
    "created": null
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_customer_status_from_invoice()",
    "created": null
  },
  {
    "table_name": "invoices",
    "trigger_name": "trigger_update_customer_status_on_invoice_change",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_customer_status_from_invoice()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "audit_journal_entries",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "audit_journal_entries",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "audit_journal_entries",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "trg_journal_entries_timestamp",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_update_timestamp()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "trg_journal_entries_validate_balance",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_validate_journal_balance()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "trigger_create_gl_entries",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION create_general_ledger_entries()",
    "created": null
  },
  {
    "table_name": "journal_entries",
    "trigger_name": "update_journal_entries_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "audit_journal_entry_lines",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "audit_journal_entry_lines",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "audit_journal_entry_lines",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION create_audit_trail()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "trg_journal_lines_update_totals",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_update_journal_totals()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "trg_journal_lines_update_totals",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_update_journal_totals()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "trg_journal_lines_update_totals",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION trigger_update_journal_totals()",
    "created": null
  },
  {
    "table_name": "journal_entry_lines",
    "trigger_name": "update_journal_entry_lines_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "liability_payments",
    "trigger_name": "trigger_update_liability_payments_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_liability_payments_updated_at()",
    "created": null
  },
  {
    "table_name": "liability_payments",
    "trigger_name": "trigger_update_loan_balance_on_payment",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_loan_current_balance()",
    "created": null
  },
  {
    "table_name": "loan_opening_balances",
    "trigger_name": "trigger_update_loan_opening_balances_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_loan_opening_balances_updated_at()",
    "created": null
  },
  {
    "table_name": "meta_ads_leads",
    "trigger_name": "trigger_update_lead_timestamp",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_lead_updated_at()",
    "created": null
  },
  {
    "table_name": "objects",
    "trigger_name": "objects_delete_delete_prefix",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "created": null
  },
  {
    "table_name": "objects",
    "trigger_name": "objects_insert_create_prefix",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION storage.objects_insert_prefix_trigger()",
    "created": null
  },
  {
    "table_name": "objects",
    "trigger_name": "objects_update_create_prefix",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION storage.objects_update_prefix_trigger()",
    "created": null
  },
  {
    "table_name": "objects",
    "trigger_name": "update_objects_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION storage.update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "opening_stock_snapshots",
    "trigger_name": "trigger_update_opening_stock_timestamp",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_opening_stock_timestamp()",
    "created": null
  },
  {
    "table_name": "partners",
    "trigger_name": "update_partners_modtime",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_modified_column()",
    "created": null
  },
  {
    "table_name": "prefixes",
    "trigger_name": "prefixes_create_hierarchy",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION storage.prefixes_insert_trigger()",
    "created": null
  },
  {
    "table_name": "prefixes",
    "trigger_name": "prefixes_delete_hierarchy",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "created": null
  },
  {
    "table_name": "products",
    "trigger_name": "trg_products_set_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION set_updated_at()",
    "created": null
  },
  {
    "table_name": "products",
    "trigger_name": "trg_products_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "purchase_order_items",
    "trigger_name": "update_purchase_order_items_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "purchase_orders",
    "trigger_name": "trg_purchase_orders_create_journal",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_create_purchase_journal_entry()",
    "created": null
  },
  {
    "table_name": "purchase_return_line_items",
    "trigger_name": "trigger_update_purchase_return_totals",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_purchase_return_totals()",
    "created": null
  },
  {
    "table_name": "purchase_return_line_items",
    "trigger_name": "trigger_update_purchase_return_totals",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_purchase_return_totals()",
    "created": null
  },
  {
    "table_name": "purchase_return_line_items",
    "trigger_name": "trigger_update_purchase_return_totals",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_purchase_return_totals()",
    "created": null
  },
  {
    "table_name": "purchase_returns",
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_return_tracking()",
    "created": null
  },
  {
    "table_name": "purchase_returns",
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_return_tracking()",
    "created": null
  },
  {
    "table_name": "purchase_returns",
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_return_tracking()",
    "created": null
  },
  {
    "table_name": "returns",
    "trigger_name": "trigger_validate_return_creation",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION validate_return_creation()",
    "created": null
  },
  {
    "table_name": "returns",
    "trigger_name": "trigger_validate_return_creation",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION validate_return_creation()",
    "created": null
  },
  {
    "table_name": "role_access_config",
    "trigger_name": "trigger_update_role_access_config_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_role_access_config_updated_at()",
    "created": null
  },
  {
    "table_name": "sales_order_items",
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION calculate_sales_order_item_tax()",
    "created": null
  },
  {
    "table_name": "sales_order_items",
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION calculate_sales_order_item_tax()",
    "created": null
  },
  {
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_delete",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_sales_order_item_totals()",
    "created": null
  },
  {
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_insert",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_sales_order_item_totals()",
    "created": null
  },
  {
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_update",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_sales_order_item_totals()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "sales_order_analytics_trigger",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION trigger_analytics_update()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "sales_order_analytics_trigger",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_analytics_update()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "sales_order_analytics_trigger",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_analytics_update()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_create_journal",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_create_sales_journal_entry()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_set_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION set_updated_at()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "sales_orders",
    "trigger_name": "trigger_update_customer_status_on_order",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_customer_status_from_sales_order()",
    "created": null
  },
  {
    "table_name": "stock_adjustments",
    "trigger_name": "apply_stock_adjustment_trigger",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION apply_stock_adjustment()",
    "created": null
  },
  {
    "table_name": "stock_adjustments",
    "trigger_name": "stock_adjustments_updated_at_trigger",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_stock_adjustments_updated_at()",
    "created": null
  },
  {
    "table_name": "subscription",
    "trigger_name": "tr_check_filters",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION realtime.subscription_check_filters()",
    "created": null
  },
  {
    "table_name": "subscription",
    "trigger_name": "tr_check_filters",
    "trigger_timing": "BEFORE",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION realtime.subscription_check_filters()",
    "created": null
  },
  {
    "table_name": "suppliers",
    "trigger_name": "trg_suppliers_set_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION set_updated_at()",
    "created": null
  },
  {
    "table_name": "suppliers",
    "trigger_name": "trg_suppliers_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "support_tickets",
    "trigger_name": "update_support_tickets_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "user_notification_settings",
    "trigger_name": "update_user_notification_settings_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  },
  {
    "table_name": "vendor_bill_line_items",
    "trigger_name": "trigger_vendor_bill_line_items_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_line_items_updated_at()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_create_journal",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_update_po_status",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION trigger_update_po_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_update_po_status",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION trigger_update_po_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_update_po_status",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION trigger_update_po_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_po_payment_status",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_purchase_order_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_po_payment_status",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_purchase_order_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_po_payment_status",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_purchase_order_payment_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_vendor_bill_status",
    "trigger_timing": "AFTER",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_vendor_bill_status",
    "trigger_timing": "AFTER",
    "event": "INSERT",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_status()",
    "created": null
  },
  {
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_vendor_bill_status",
    "trigger_timing": "AFTER",
    "event": "DELETE",
    "function_call": "EXECUTE FUNCTION update_vendor_bill_status()",
    "created": null
  },
  {
    "table_name": "withdrawals",
    "trigger_name": "update_withdrawals_modtime",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_modified_column()",
    "created": null
  },
  {
    "table_name": "work_orders",
    "trigger_name": "trg_work_orders_set_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION set_updated_at()",
    "created": null
  },
  {
    "table_name": "work_orders",
    "trigger_name": "trg_work_orders_updated_at",
    "trigger_timing": "BEFORE",
    "event": "UPDATE",
    "function_call": "EXECUTE FUNCTION update_updated_at_column()",
    "created": null
  }
]