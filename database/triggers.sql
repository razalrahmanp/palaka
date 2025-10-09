[
  {
    "schema_name": "public",
    "table_name": "bank_transactions",
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "trigger_definition": "CREATE TRIGGER trg_bank_transactions_sync_chart_accounts AFTER INSERT OR DELETE OR UPDATE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION sync_bank_account_to_chart_of_accounts()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chart_of_accounts",
    "trigger_name": "audit_chart_of_accounts",
    "function_name": "create_audit_trail",
    "trigger_definition": "CREATE TRIGGER audit_chart_of_accounts AFTER INSERT OR DELETE OR UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION create_audit_trail()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chart_of_accounts",
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "function_name": "trigger_create_opening_balance",
    "trigger_definition": "CREATE TRIGGER trg_chart_of_accounts_opening_balance AFTER INSERT OR UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION trigger_create_opening_balance()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chart_of_accounts",
    "trigger_name": "trg_chart_of_accounts_timestamp",
    "function_name": "trigger_update_timestamp",
    "trigger_definition": "CREATE TRIGGER trg_chart_of_accounts_timestamp BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chat_messages",
    "trigger_name": "chat_room_last_message_trigger",
    "function_name": "update_chat_room_last_message",
    "trigger_definition": "CREATE TRIGGER chat_room_last_message_trigger AFTER INSERT OR UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_chat_room_last_message()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chat_messages",
    "trigger_name": "trigger_create_message_notifications",
    "function_name": "create_message_notifications",
    "trigger_definition": "CREATE TRIGGER trigger_create_message_notifications AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION create_message_notifications()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chat_participants",
    "trigger_name": "chat_participant_count_trigger",
    "function_name": "update_chat_room_participant_count",
    "trigger_definition": "CREATE TRIGGER chat_participant_count_trigger AFTER INSERT OR DELETE OR UPDATE ON chat_participants FOR EACH ROW EXECUTE FUNCTION update_chat_room_participant_count()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chat_rooms",
    "trigger_name": "trigger_add_creator_as_participant",
    "function_name": "add_creator_as_participant",
    "trigger_definition": "CREATE TRIGGER trigger_add_creator_as_participant AFTER INSERT ON chat_rooms FOR EACH ROW EXECUTE FUNCTION add_creator_as_participant()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "chat_rooms",
    "trigger_name": "update_chat_rooms_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "custom_products",
    "trigger_name": "calculate_cost_price_trigger",
    "function_name": "calculate_custom_product_cost_price",
    "trigger_definition": "CREATE TRIGGER calculate_cost_price_trigger BEFORE INSERT OR UPDATE ON custom_products FOR EACH ROW EXECUTE FUNCTION calculate_custom_product_cost_price()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "customers",
    "trigger_name": "trg_customers_set_updated_at",
    "function_name": "set_updated_at",
    "trigger_definition": "CREATE TRIGGER trg_customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "customers",
    "trigger_name": "trg_customers_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "deliveries",
    "trigger_name": "trigger_update_route_efficiency",
    "function_name": "update_route_efficiency",
    "trigger_definition": "CREATE TRIGGER trigger_update_route_efficiency AFTER INSERT OR DELETE OR UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_route_efficiency()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_delivery_status_from_items",
    "function_name": "update_delivery_status_from_items",
    "trigger_definition": "CREATE TRIGGER trigger_update_delivery_status_from_items AFTER INSERT OR DELETE OR UPDATE ON delivery_items FOR EACH ROW EXECUTE FUNCTION update_delivery_status_from_items()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "delivery_items",
    "trigger_name": "trigger_update_sales_order_delivery_status",
    "function_name": "update_sales_order_delivery_status",
    "trigger_definition": "CREATE TRIGGER trigger_update_sales_order_delivery_status AFTER UPDATE ON delivery_items FOR EACH ROW WHEN (old.item_status IS DISTINCT FROM new.item_status) EXECUTE FUNCTION update_sales_order_delivery_status()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "expenses",
    "trigger_name": "trigger_expenses_updated_at",
    "function_name": "update_expenses_updated_at",
    "trigger_definition": "CREATE TRIGGER trigger_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_update_balance",
    "function_name": "trigger_update_account_balance",
    "trigger_definition": "CREATE TRIGGER trg_general_ledger_update_balance AFTER INSERT OR DELETE OR UPDATE ON general_ledger FOR EACH ROW EXECUTE FUNCTION trigger_update_account_balance()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "general_ledger",
    "trigger_name": "trg_general_ledger_validate_account",
    "function_name": "trigger_validate_account_usage",
    "trigger_definition": "CREATE TRIGGER trg_general_ledger_validate_account BEFORE INSERT OR UPDATE ON general_ledger FOR EACH ROW EXECUTE FUNCTION trigger_validate_account_usage()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "general_ledger",
    "trigger_name": "trigger_update_account_balance",
    "function_name": "update_account_balance",
    "trigger_definition": "CREATE TRIGGER trigger_update_account_balance AFTER INSERT OR DELETE ON general_ledger FOR EACH ROW EXECUTE FUNCTION update_account_balance()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "investments",
    "trigger_name": "update_investments_modtime",
    "function_name": "update_modified_column",
    "trigger_definition": "CREATE TRIGGER update_investments_modtime BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_modified_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "invoice_refunds",
    "trigger_name": "trigger_update_invoice_refund_totals",
    "function_name": "update_invoice_refund_totals",
    "trigger_definition": "CREATE TRIGGER trigger_update_invoice_refund_totals AFTER INSERT OR UPDATE OF status, refund_amount ON invoice_refunds FOR EACH ROW EXECUTE FUNCTION update_invoice_refund_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "invoices",
    "trigger_name": "trg_invoices_create_journal",
    "function_name": "trigger_create_sales_journal_entry",
    "trigger_definition": "CREATE TRIGGER trg_invoices_create_journal AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_create_sales_journal_entry()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entries",
    "trigger_name": "audit_journal_entries",
    "function_name": "create_audit_trail",
    "trigger_definition": "CREATE TRIGGER audit_journal_entries AFTER INSERT OR DELETE OR UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION create_audit_trail()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entries",
    "trigger_name": "trg_journal_entries_timestamp",
    "function_name": "trigger_update_timestamp",
    "trigger_definition": "CREATE TRIGGER trg_journal_entries_timestamp BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entries",
    "trigger_name": "trg_journal_entries_validate_balance",
    "function_name": "trigger_validate_journal_balance",
    "trigger_definition": "CREATE TRIGGER trg_journal_entries_validate_balance BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION trigger_validate_journal_balance()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entries",
    "trigger_name": "trigger_create_gl_entries",
    "function_name": "create_general_ledger_entries",
    "trigger_definition": "CREATE TRIGGER trigger_create_gl_entries AFTER UPDATE OF status ON journal_entries FOR EACH ROW EXECUTE FUNCTION create_general_ledger_entries()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entries",
    "trigger_name": "update_journal_entries_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entry_lines",
    "trigger_name": "audit_journal_entry_lines",
    "function_name": "create_audit_trail",
    "trigger_definition": "CREATE TRIGGER audit_journal_entry_lines AFTER INSERT OR DELETE OR UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION create_audit_trail()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entry_lines",
    "trigger_name": "trg_journal_lines_update_totals",
    "function_name": "trigger_update_journal_totals",
    "trigger_definition": "CREATE TRIGGER trg_journal_lines_update_totals AFTER INSERT OR DELETE OR UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION trigger_update_journal_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "journal_entry_lines",
    "trigger_name": "update_journal_entry_lines_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_journal_entry_lines_updated_at BEFORE UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "liability_payments",
    "trigger_name": "trigger_update_liability_payments_updated_at",
    "function_name": "update_liability_payments_updated_at",
    "trigger_definition": "CREATE TRIGGER trigger_update_liability_payments_updated_at BEFORE UPDATE ON liability_payments FOR EACH ROW EXECUTE FUNCTION update_liability_payments_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "liability_payments",
    "trigger_name": "trigger_update_loan_balance_on_payment",
    "function_name": "update_loan_current_balance",
    "trigger_definition": "CREATE TRIGGER trigger_update_loan_balance_on_payment AFTER INSERT ON liability_payments FOR EACH ROW EXECUTE FUNCTION update_loan_current_balance()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "loan_opening_balances",
    "trigger_name": "trigger_update_loan_opening_balances_updated_at",
    "function_name": "update_loan_opening_balances_updated_at",
    "trigger_definition": "CREATE TRIGGER trigger_update_loan_opening_balances_updated_at BEFORE UPDATE ON loan_opening_balances FOR EACH ROW EXECUTE FUNCTION update_loan_opening_balances_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "partners",
    "trigger_name": "update_partners_modtime",
    "function_name": "update_modified_column",
    "trigger_definition": "CREATE TRIGGER update_partners_modtime BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_modified_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "products",
    "trigger_name": "trg_products_set_updated_at",
    "function_name": "set_updated_at",
    "trigger_definition": "CREATE TRIGGER trg_products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "products",
    "trigger_name": "trg_products_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "purchase_order_items",
    "trigger_name": "update_purchase_order_items_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "purchase_orders",
    "trigger_name": "trg_purchase_orders_create_journal",
    "function_name": "trigger_create_purchase_journal_entry",
    "trigger_definition": "CREATE TRIGGER trg_purchase_orders_create_journal AFTER INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_create_purchase_journal_entry()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "purchase_return_line_items",
    "trigger_name": "trigger_update_purchase_return_totals",
    "function_name": "update_purchase_return_totals",
    "trigger_definition": "CREATE TRIGGER trigger_update_purchase_return_totals AFTER INSERT OR DELETE OR UPDATE ON purchase_return_line_items FOR EACH ROW EXECUTE FUNCTION update_purchase_return_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "purchase_returns",
    "trigger_name": "trigger_update_vendor_bill_return_tracking",
    "function_name": "update_vendor_bill_return_tracking",
    "trigger_definition": "CREATE TRIGGER trigger_update_vendor_bill_return_tracking AFTER INSERT OR DELETE OR UPDATE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION update_vendor_bill_return_tracking()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "returns",
    "trigger_name": "trigger_validate_return_creation",
    "function_name": "validate_return_creation",
    "trigger_definition": "CREATE TRIGGER trigger_validate_return_creation BEFORE INSERT OR UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION validate_return_creation()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_order_items",
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "function_name": "calculate_sales_order_item_tax",
    "trigger_definition": "CREATE TRIGGER calculate_sales_order_item_tax_trigger BEFORE INSERT OR UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION calculate_sales_order_item_tax()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_delete",
    "function_name": "update_sales_order_item_totals",
    "trigger_definition": "CREATE TRIGGER update_sales_order_item_totals_delete AFTER DELETE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_insert",
    "function_name": "update_sales_order_item_totals",
    "trigger_definition": "CREATE TRIGGER update_sales_order_item_totals_insert AFTER INSERT ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_order_items",
    "trigger_name": "update_sales_order_item_totals_update",
    "function_name": "update_sales_order_item_totals",
    "trigger_definition": "CREATE TRIGGER update_sales_order_item_totals_update AFTER UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_orders",
    "trigger_name": "sales_order_analytics_trigger",
    "function_name": "trigger_analytics_update",
    "trigger_definition": "CREATE TRIGGER sales_order_analytics_trigger AFTER INSERT OR DELETE OR UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION trigger_analytics_update()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_create_journal",
    "function_name": "trigger_create_sales_journal_entry",
    "trigger_definition": "CREATE TRIGGER trg_sales_orders_create_journal AFTER INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION trigger_create_sales_journal_entry()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_set_updated_at",
    "function_name": "set_updated_at",
    "trigger_definition": "CREATE TRIGGER trg_sales_orders_set_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "sales_orders",
    "trigger_name": "trg_sales_orders_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "stock_adjustments",
    "trigger_name": "apply_stock_adjustment_trigger",
    "function_name": "apply_stock_adjustment",
    "trigger_definition": "CREATE TRIGGER apply_stock_adjustment_trigger AFTER INSERT ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION apply_stock_adjustment()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "stock_adjustments",
    "trigger_name": "stock_adjustments_updated_at_trigger",
    "function_name": "update_stock_adjustments_updated_at",
    "trigger_definition": "CREATE TRIGGER stock_adjustments_updated_at_trigger BEFORE UPDATE ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION update_stock_adjustments_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "suppliers",
    "trigger_name": "trg_suppliers_set_updated_at",
    "function_name": "set_updated_at",
    "trigger_definition": "CREATE TRIGGER trg_suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "suppliers",
    "trigger_name": "trg_suppliers_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "support_tickets",
    "trigger_name": "update_support_tickets_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "user_notification_settings",
    "trigger_name": "update_user_notification_settings_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON user_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "vendor_bill_line_items",
    "trigger_name": "trigger_vendor_bill_line_items_updated_at",
    "function_name": "update_vendor_bill_line_items_updated_at",
    "trigger_definition": "CREATE TRIGGER trigger_vendor_bill_line_items_updated_at BEFORE UPDATE ON vendor_bill_line_items FOR EACH ROW EXECUTE FUNCTION update_vendor_bill_line_items_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_create_journal",
    "function_name": "trigger_create_vendor_payment_journal_entry",
    "trigger_definition": "CREATE TRIGGER trg_vendor_payments_create_journal AFTER INSERT ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "vendor_payment_history",
    "trigger_name": "trg_vendor_payments_update_po_status",
    "function_name": "trigger_update_po_payment_status",
    "trigger_definition": "CREATE TRIGGER trg_vendor_payments_update_po_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION trigger_update_po_payment_status()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_po_payment_status",
    "function_name": "update_purchase_order_payment_status",
    "trigger_definition": "CREATE TRIGGER trigger_update_po_payment_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION update_purchase_order_payment_status()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "vendor_payment_history",
    "trigger_name": "trigger_update_vendor_bill_status",
    "function_name": "update_vendor_bill_status",
    "trigger_definition": "CREATE TRIGGER trigger_update_vendor_bill_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION update_vendor_bill_status()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "withdrawals",
    "trigger_name": "update_withdrawals_modtime",
    "function_name": "update_modified_column",
    "trigger_definition": "CREATE TRIGGER update_withdrawals_modtime BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION update_modified_column()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "work_orders",
    "trigger_name": "trg_work_orders_set_updated_at",
    "function_name": "set_updated_at",
    "trigger_definition": "CREATE TRIGGER trg_work_orders_set_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "enabled": "O"
  },
  {
    "schema_name": "public",
    "table_name": "work_orders",
    "trigger_name": "trg_work_orders_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "realtime",
    "table_name": "subscription",
    "trigger_name": "tr_check_filters",
    "function_name": "subscription_check_filters",
    "trigger_definition": "CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "function_name": "enforce_bucket_name_length",
    "trigger_definition": "CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "trigger_name": "objects_delete_delete_prefix",
    "function_name": "delete_prefix_hierarchy_trigger",
    "trigger_definition": "CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "trigger_name": "objects_insert_create_prefix",
    "function_name": "objects_insert_prefix_trigger",
    "trigger_definition": "CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "trigger_name": "objects_update_create_prefix",
    "function_name": "objects_update_prefix_trigger",
    "trigger_definition": "CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (new.name <> old.name OR new.bucket_id <> old.bucket_id) EXECUTE FUNCTION storage.objects_update_prefix_trigger()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "objects",
    "trigger_name": "update_objects_updated_at",
    "function_name": "update_updated_at_column",
    "trigger_definition": "CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "prefixes",
    "trigger_name": "prefixes_create_hierarchy",
    "function_name": "prefixes_insert_trigger",
    "trigger_definition": "CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN (pg_trigger_depth() < 1) EXECUTE FUNCTION storage.prefixes_insert_trigger()",
    "enabled": "O"
  },
  {
    "schema_name": "storage",
    "table_name": "prefixes",
    "trigger_name": "prefixes_delete_hierarchy",
    "function_name": "delete_prefix_hierarchy_trigger",
    "trigger_definition": "CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "enabled": "O"
  }
]