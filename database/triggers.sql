[
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "schema_name": "public",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "definition": "CREATE TRIGGER trg_bank_transactions_sync_chart_accounts AFTER INSERT OR DELETE OR UPDATE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION sync_bank_account_to_chart_of_accounts()"
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "schema_name": "public",
    "function_name": "create_audit_trail",
    "definition": "CREATE TRIGGER audit_chart_of_accounts AFTER INSERT OR DELETE OR UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION create_audit_trail()"
  },
  {
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "table_name": "chart_of_accounts",
    "schema_name": "public",
    "function_name": "trigger_create_opening_balance",
    "definition": "CREATE TRIGGER trg_chart_of_accounts_opening_balance AFTER INSERT OR UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION trigger_create_opening_balance()"
  },
  {
    "trigger_name": "trg_chart_of_accounts_timestamp",
    "table_name": "chart_of_accounts",
    "schema_name": "public",
    "function_name": "trigger_update_timestamp",
    "definition": "CREATE TRIGGER trg_chart_of_accounts_timestamp BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp()"
  },
  {
    "trigger_name": "chat_room_last_message_trigger",
    "table_name": "chat_messages",
    "schema_name": "public",
    "function_name": "update_chat_room_last_message",
    "definition": "CREATE TRIGGER chat_room_last_message_trigger AFTER INSERT OR UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_chat_room_last_message()"
  },
  {
    "trigger_name": "trigger_create_message_notifications",
    "table_name": "chat_messages",
    "schema_name": "public",
    "function_name": "create_message_notifications",
    "definition": "CREATE TRIGGER trigger_create_message_notifications AFTER INSERT ON chat_messages FOR EACH ROW EXECUTE FUNCTION create_message_notifications()"
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "schema_name": "public",
    "function_name": "update_chat_room_participant_count",
    "definition": "CREATE TRIGGER chat_participant_count_trigger AFTER INSERT OR DELETE OR UPDATE ON chat_participants FOR EACH ROW EXECUTE FUNCTION update_chat_room_participant_count()"
  },
  {
    "trigger_name": "trigger_add_creator_as_participant",
    "table_name": "chat_rooms",
    "schema_name": "public",
    "function_name": "add_creator_as_participant",
    "definition": "CREATE TRIGGER trigger_add_creator_as_participant AFTER INSERT ON chat_rooms FOR EACH ROW EXECUTE FUNCTION add_creator_as_participant()"
  },
  {
    "trigger_name": "update_chat_rooms_updated_at",
    "table_name": "chat_rooms",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "calculate_cost_price_trigger",
    "table_name": "custom_products",
    "schema_name": "public",
    "function_name": "calculate_custom_product_cost_price",
    "definition": "CREATE TRIGGER calculate_cost_price_trigger BEFORE INSERT OR UPDATE ON custom_products FOR EACH ROW EXECUTE FUNCTION calculate_custom_product_cost_price()"
  },
  {
    "trigger_name": "trg_customers_set_updated_at",
    "table_name": "customers",
    "schema_name": "public",
    "function_name": "set_updated_at",
    "definition": "CREATE TRIGGER trg_customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
  },
  {
    "trigger_name": "trg_customers_updated_at",
    "table_name": "customers",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "schema_name": "public",
    "function_name": "update_route_efficiency",
    "definition": "CREATE TRIGGER trigger_update_route_efficiency AFTER INSERT OR DELETE OR UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_route_efficiency()"
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "schema_name": "public",
    "function_name": "update_delivery_status_from_items",
    "definition": "CREATE TRIGGER trigger_update_delivery_status_from_items AFTER INSERT OR DELETE OR UPDATE ON delivery_items FOR EACH ROW EXECUTE FUNCTION update_delivery_status_from_items()"
  },
  {
    "trigger_name": "trigger_update_sales_order_delivery_status",
    "table_name": "delivery_items",
    "schema_name": "public",
    "function_name": "update_sales_order_delivery_status",
    "definition": "CREATE TRIGGER trigger_update_sales_order_delivery_status AFTER UPDATE ON delivery_items FOR EACH ROW WHEN (old.item_status IS DISTINCT FROM new.item_status) EXECUTE FUNCTION update_sales_order_delivery_status()"
  },
  {
    "trigger_name": "trigger_expenses_updated_at",
    "table_name": "expenses",
    "schema_name": "public",
    "function_name": "update_expenses_updated_at",
    "definition": "CREATE TRIGGER trigger_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at()"
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "schema_name": "public",
    "function_name": "trigger_update_account_balance",
    "definition": "CREATE TRIGGER trg_general_ledger_update_balance AFTER INSERT OR DELETE OR UPDATE ON general_ledger FOR EACH ROW EXECUTE FUNCTION trigger_update_account_balance()"
  },
  {
    "trigger_name": "trg_general_ledger_validate_account",
    "table_name": "general_ledger",
    "schema_name": "public",
    "function_name": "trigger_validate_account_usage",
    "definition": "CREATE TRIGGER trg_general_ledger_validate_account BEFORE INSERT OR UPDATE ON general_ledger FOR EACH ROW EXECUTE FUNCTION trigger_validate_account_usage()"
  },
  {
    "trigger_name": "trigger_update_account_balance",
    "table_name": "general_ledger",
    "schema_name": "public",
    "function_name": "update_account_balance",
    "definition": "CREATE TRIGGER trigger_update_account_balance AFTER INSERT OR DELETE ON general_ledger FOR EACH ROW EXECUTE FUNCTION update_account_balance()"
  },
  {
    "trigger_name": "trg_invoices_create_journal",
    "table_name": "invoices",
    "schema_name": "public",
    "function_name": "trigger_create_sales_journal_entry",
    "definition": "CREATE TRIGGER trg_invoices_create_journal AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_create_sales_journal_entry()"
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "schema_name": "public",
    "function_name": "create_audit_trail",
    "definition": "CREATE TRIGGER audit_journal_entries AFTER INSERT OR DELETE OR UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION create_audit_trail()"
  },
  {
    "trigger_name": "trg_journal_entries_timestamp",
    "table_name": "journal_entries",
    "schema_name": "public",
    "function_name": "trigger_update_timestamp",
    "definition": "CREATE TRIGGER trg_journal_entries_timestamp BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp()"
  },
  {
    "trigger_name": "trg_journal_entries_validate_balance",
    "table_name": "journal_entries",
    "schema_name": "public",
    "function_name": "trigger_validate_journal_balance",
    "definition": "CREATE TRIGGER trg_journal_entries_validate_balance BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION trigger_validate_journal_balance()"
  },
  {
    "trigger_name": "trigger_create_gl_entries",
    "table_name": "journal_entries",
    "schema_name": "public",
    "function_name": "create_general_ledger_entries",
    "definition": "CREATE TRIGGER trigger_create_gl_entries AFTER UPDATE OF status ON journal_entries FOR EACH ROW EXECUTE FUNCTION create_general_ledger_entries()"
  },
  {
    "trigger_name": "update_journal_entries_updated_at",
    "table_name": "journal_entries",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "schema_name": "public",
    "function_name": "create_audit_trail",
    "definition": "CREATE TRIGGER audit_journal_entry_lines AFTER INSERT OR DELETE OR UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION create_audit_trail()"
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "schema_name": "public",
    "function_name": "trigger_update_journal_totals",
    "definition": "CREATE TRIGGER trg_journal_lines_update_totals AFTER INSERT OR DELETE OR UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION trigger_update_journal_totals()"
  },
  {
    "trigger_name": "update_journal_entry_lines_updated_at",
    "table_name": "journal_entry_lines",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_journal_entry_lines_updated_at BEFORE UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "trg_products_set_updated_at",
    "table_name": "products",
    "schema_name": "public",
    "function_name": "set_updated_at",
    "definition": "CREATE TRIGGER trg_products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
  },
  {
    "trigger_name": "trg_products_updated_at",
    "table_name": "products",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_purchase_order_items_updated_at",
    "table_name": "purchase_order_items",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "trg_purchase_orders_create_journal",
    "table_name": "purchase_orders",
    "schema_name": "public",
    "function_name": "trigger_create_purchase_journal_entry",
    "definition": "CREATE TRIGGER trg_purchase_orders_create_journal AFTER INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_create_purchase_journal_entry()"
  },
  {
    "trigger_name": "trigger_purchase_order_create_vendor_bill",
    "table_name": "purchase_orders",
    "schema_name": "public",
    "function_name": "handle_purchase_order_vendor_bill",
    "definition": "CREATE TRIGGER trigger_purchase_order_create_vendor_bill AFTER INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION handle_purchase_order_vendor_bill()"
  },
  {
    "trigger_name": "trigger_purchase_order_update_vendor_bill",
    "table_name": "purchase_orders",
    "schema_name": "public",
    "function_name": "handle_purchase_order_vendor_bill",
    "definition": "CREATE TRIGGER trigger_purchase_order_update_vendor_bill AFTER UPDATE OF total ON purchase_orders FOR EACH ROW WHEN (old.total IS DISTINCT FROM new.total) EXECUTE FUNCTION handle_purchase_order_vendor_bill()"
  },
  {
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "table_name": "sales_order_items",
    "schema_name": "public",
    "function_name": "calculate_sales_order_item_tax",
    "definition": "CREATE TRIGGER calculate_sales_order_item_tax_trigger BEFORE INSERT OR UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION calculate_sales_order_item_tax()"
  },
  {
    "trigger_name": "update_sales_order_item_totals_delete",
    "table_name": "sales_order_items",
    "schema_name": "public",
    "function_name": "update_sales_order_item_totals",
    "definition": "CREATE TRIGGER update_sales_order_item_totals_delete AFTER DELETE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()"
  },
  {
    "trigger_name": "update_sales_order_item_totals_insert",
    "table_name": "sales_order_items",
    "schema_name": "public",
    "function_name": "update_sales_order_item_totals",
    "definition": "CREATE TRIGGER update_sales_order_item_totals_insert AFTER INSERT ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()"
  },
  {
    "trigger_name": "update_sales_order_item_totals_update",
    "table_name": "sales_order_items",
    "schema_name": "public",
    "function_name": "update_sales_order_item_totals",
    "definition": "CREATE TRIGGER update_sales_order_item_totals_update AFTER UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_sales_order_item_totals()"
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "schema_name": "public",
    "function_name": "trigger_analytics_update",
    "definition": "CREATE TRIGGER sales_order_analytics_trigger AFTER INSERT OR DELETE OR UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION trigger_analytics_update()"
  },
  {
    "trigger_name": "trg_sales_orders_create_journal",
    "table_name": "sales_orders",
    "schema_name": "public",
    "function_name": "trigger_create_sales_journal_entry",
    "definition": "CREATE TRIGGER trg_sales_orders_create_journal AFTER INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION trigger_create_sales_journal_entry()"
  },
  {
    "trigger_name": "trg_sales_orders_set_updated_at",
    "table_name": "sales_orders",
    "schema_name": "public",
    "function_name": "set_updated_at",
    "definition": "CREATE TRIGGER trg_sales_orders_set_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
  },
  {
    "trigger_name": "trg_sales_orders_updated_at",
    "table_name": "sales_orders",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "apply_stock_adjustment_trigger",
    "table_name": "stock_adjustments",
    "schema_name": "public",
    "function_name": "apply_stock_adjustment",
    "definition": "CREATE TRIGGER apply_stock_adjustment_trigger AFTER INSERT ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION apply_stock_adjustment()"
  },
  {
    "trigger_name": "stock_adjustments_updated_at_trigger",
    "table_name": "stock_adjustments",
    "schema_name": "public",
    "function_name": "update_stock_adjustments_updated_at",
    "definition": "CREATE TRIGGER stock_adjustments_updated_at_trigger BEFORE UPDATE ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION update_stock_adjustments_updated_at()"
  },
  {
    "trigger_name": "trg_suppliers_set_updated_at",
    "table_name": "suppliers",
    "schema_name": "public",
    "function_name": "set_updated_at",
    "definition": "CREATE TRIGGER trg_suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
  },
  {
    "trigger_name": "trg_suppliers_updated_at",
    "table_name": "suppliers",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_support_tickets_updated_at",
    "table_name": "support_tickets",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "update_user_notification_settings_updated_at",
    "table_name": "user_notification_settings",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON user_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "trg_vendor_payments_create_journal",
    "table_name": "vendor_payment_history",
    "schema_name": "public",
    "function_name": "trigger_create_vendor_payment_journal_entry",
    "definition": "CREATE TRIGGER trg_vendor_payments_create_journal AFTER INSERT ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry()"
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "schema_name": "public",
    "function_name": "trigger_update_po_payment_status",
    "definition": "CREATE TRIGGER trg_vendor_payments_update_po_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION trigger_update_po_payment_status()"
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "schema_name": "public",
    "function_name": "update_purchase_order_payment_status",
    "definition": "CREATE TRIGGER trigger_update_po_payment_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION update_purchase_order_payment_status()"
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "schema_name": "public",
    "function_name": "update_vendor_bill_status",
    "definition": "CREATE TRIGGER trigger_update_vendor_bill_status AFTER INSERT OR DELETE OR UPDATE ON vendor_payment_history FOR EACH ROW EXECUTE FUNCTION update_vendor_bill_status()"
  },
  {
    "trigger_name": "trg_work_orders_set_updated_at",
    "table_name": "work_orders",
    "schema_name": "public",
    "function_name": "set_updated_at",
    "definition": "CREATE TRIGGER trg_work_orders_set_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
  },
  {
    "trigger_name": "trg_work_orders_updated_at",
    "table_name": "work_orders",
    "schema_name": "public",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "schema_name": "realtime",
    "function_name": "subscription_check_filters",
    "definition": "CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()"
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "table_name": "buckets",
    "schema_name": "storage",
    "function_name": "enforce_bucket_name_length",
    "definition": "CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()"
  },
  {
    "trigger_name": "objects_delete_delete_prefix",
    "table_name": "objects",
    "schema_name": "storage",
    "function_name": "delete_prefix_hierarchy_trigger",
    "definition": "CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()"
  },
  {
    "trigger_name": "objects_insert_create_prefix",
    "table_name": "objects",
    "schema_name": "storage",
    "function_name": "objects_insert_prefix_trigger",
    "definition": "CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger()"
  },
  {
    "trigger_name": "objects_update_create_prefix",
    "table_name": "objects",
    "schema_name": "storage",
    "function_name": "objects_update_prefix_trigger",
    "definition": "CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (new.name <> old.name OR new.bucket_id <> old.bucket_id) EXECUTE FUNCTION storage.objects_update_prefix_trigger()"
  },
  {
    "trigger_name": "update_objects_updated_at",
    "table_name": "objects",
    "schema_name": "storage",
    "function_name": "update_updated_at_column",
    "definition": "CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()"
  },
  {
    "trigger_name": "prefixes_create_hierarchy",
    "table_name": "prefixes",
    "schema_name": "storage",
    "function_name": "prefixes_insert_trigger",
    "definition": "CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN (pg_trigger_depth() < 1) EXECUTE FUNCTION storage.prefixes_insert_trigger()"
  },
  {
    "trigger_name": "prefixes_delete_hierarchy",
    "table_name": "prefixes",
    "schema_name": "storage",
    "function_name": "delete_prefix_hierarchy_trigger",
    "definition": "CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()"
  }
]