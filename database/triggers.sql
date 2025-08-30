| trigger_name                                 | table_name                 | event  | function_name                        | function_source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | enabled | type_flags |
| -------------------------------------------- | -------------------------- | ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| enforce_bucket_name_length_trigger           | buckets                    | UPDATE | enforce_bucket_name_length           | 
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | O       | 23         |
| enforce_bucket_name_length_trigger           | buckets                    | INSERT | enforce_bucket_name_length           | 
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | O       | 23         |
| audit_chart_of_accounts                      | chart_of_accounts          | UPDATE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_chart_of_accounts                      | chart_of_accounts          | INSERT | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_chart_of_accounts                      | chart_of_accounts          | DELETE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| chat_room_last_message_trigger               | chat_messages              | UPDATE | update_chat_room_last_message        | 
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET last_message_at = NEW.sent_at
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chat_rooms 
        SET last_message_at = NEW.sent_at
        WHERE id = NEW.room_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | O       | 21         |
| chat_room_last_message_trigger               | chat_messages              | INSERT | update_chat_room_last_message        | 
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET last_message_at = NEW.sent_at
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chat_rooms 
        SET last_message_at = NEW.sent_at
        WHERE id = NEW.room_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | O       | 21         |
| trigger_create_message_notifications         | chat_messages              | INSERT | create_message_notifications         | 
BEGIN
    -- Create notifications for all participants except the sender
    INSERT INTO chat_notifications (user_id, room_id, message_id, type)
    SELECT 
        cp.user_id,
        NEW.room_id,
        NEW.id,
        'message'
    FROM chat_participants cp
    WHERE cp.room_id = NEW.room_id 
    AND cp.user_id != NEW.sender_id
    AND cp.is_active = true;
    
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | O       | 5          |
| chat_participant_count_trigger               | chat_participants          | INSERT | update_chat_room_participant_count   | 
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = OLD.room_id AND is_active = true
        )
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | O       | 29         |
| chat_participant_count_trigger               | chat_participants          | DELETE | update_chat_room_participant_count   | 
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = OLD.room_id AND is_active = true
        )
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | O       | 29         |
| chat_participant_count_trigger               | chat_participants          | UPDATE | update_chat_room_participant_count   | 
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = NEW.room_id AND is_active = true
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_rooms 
        SET participant_count = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE room_id = OLD.room_id AND is_active = true
        )
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | O       | 29         |
| trigger_add_creator_as_participant           | chat_rooms                 | INSERT | add_creator_as_participant           | 
BEGIN
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (room_id, user_id) DO NOTHING;
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | O       | 5          |
| update_chat_rooms_updated_at                 | chat_rooms                 | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| trg_customers_set_updated_at                 | customers                  | UPDATE | set_updated_at                       | 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| trg_customers_updated_at                     | customers                  | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| trigger_update_route_efficiency              | deliveries                 | INSERT | update_route_efficiency              | 
BEGIN
    -- Update route statistics and efficiency
    UPDATE delivery_routes 
    SET 
        route_efficiency_score = (
            SELECT 
                CASE 
                    WHEN total_deliveries = 0 THEN 0
                    ELSE ROUND(
                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * 
                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2
                    )
                END
        ),
        current_load_items = (
            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)
            FROM deliveries d
            JOIN delivery_items di ON d.id = di.delivery_id
            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) 
            AND di.item_status IN ('loaded', 'in_transit')
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.route_id, OLD.route_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_route_efficiency              | deliveries                 | DELETE | update_route_efficiency              | 
BEGIN
    -- Update route statistics and efficiency
    UPDATE delivery_routes 
    SET 
        route_efficiency_score = (
            SELECT 
                CASE 
                    WHEN total_deliveries = 0 THEN 0
                    ELSE ROUND(
                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * 
                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2
                    )
                END
        ),
        current_load_items = (
            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)
            FROM deliveries d
            JOIN delivery_items di ON d.id = di.delivery_id
            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) 
            AND di.item_status IN ('loaded', 'in_transit')
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.route_id, OLD.route_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_route_efficiency              | deliveries                 | UPDATE | update_route_efficiency              | 
BEGIN
    -- Update route statistics and efficiency
    UPDATE delivery_routes 
    SET 
        route_efficiency_score = (
            SELECT 
                CASE 
                    WHEN total_deliveries = 0 THEN 0
                    ELSE ROUND(
                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * 
                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2
                    )
                END
        ),
        current_load_items = (
            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)
            FROM deliveries d
            JOIN delivery_items di ON d.id = di.delivery_id
            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) 
            AND di.item_status IN ('loaded', 'in_transit')
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.route_id, OLD.route_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_delivery_status_from_items    | delivery_items             | DELETE | update_delivery_status_from_items    | 
BEGIN
  -- Update delivery status based on item statuses
  -- Implementation depends on business logic
  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_delivery_status_from_items    | delivery_items             | INSERT | update_delivery_status_from_items    | 
BEGIN
  -- Update delivery status based on item statuses
  -- Implementation depends on business logic
  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_delivery_status_from_items    | delivery_items             | UPDATE | update_delivery_status_from_items    | 
BEGIN
  -- Update delivery status based on item statuses
  -- Implementation depends on business logic
  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 29         |
| trigger_update_sales_order_delivery_status   | delivery_items             | UPDATE | update_sales_order_delivery_status   | 
BEGIN
  -- Update sales order delivery status based on delivery items
  -- Implementation depends on business logic
  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 17         |
| trigger_update_account_balance               | general_ledger             | INSERT | update_account_balance               | 
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance + NEW.debit_amount - NEW.credit_amount
      ELSE current_balance + NEW.credit_amount - NEW.debit_amount
    END,
    updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance - OLD.debit_amount + OLD.credit_amount
      ELSE current_balance - OLD.credit_amount + OLD.debit_amount
    END,
    updated_at = NOW()
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 13         |
| trigger_update_account_balance               | general_ledger             | DELETE | update_account_balance               | 
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance + NEW.debit_amount - NEW.credit_amount
      ELSE current_balance + NEW.credit_amount - NEW.debit_amount
    END,
    updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance - OLD.debit_amount + OLD.credit_amount
      ELSE current_balance - OLD.credit_amount + OLD.debit_amount
    END,
    updated_at = NOW()
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 13         |
| audit_journal_entries                        | journal_entries            | INSERT | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_journal_entries                        | journal_entries            | UPDATE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_journal_entries                        | journal_entries            | DELETE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| trigger_create_gl_entries                    | journal_entries            | UPDATE | create_general_ledger_entries        | 
DECLARE
  line_rec RECORD;
  running_balance NUMERIC(15,2);
BEGIN
  -- Only process when status changes to 'POSTED'
  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN
    
    -- Process each journal entry line
    FOR line_rec IN 
      SELECT * FROM journal_entry_lines 
      WHERE journal_entry_id = NEW.id 
      ORDER BY line_number
    LOOP
      -- Calculate running balance for the account
      SELECT COALESCE(
        (SELECT running_balance FROM general_ledger 
         WHERE account_id = line_rec.account_id 
         ORDER BY created_at DESC, id DESC 
         LIMIT 1), 
        (SELECT opening_balance FROM chart_of_accounts WHERE id = line_rec.account_id)
      ) INTO running_balance;
      
      -- Update running balance
      running_balance := running_balance + line_rec.debit_amount - line_rec.credit_amount;
      
      -- Insert into general ledger
      INSERT INTO general_ledger (
        account_id,
        journal_entry_id,
        journal_line_id,
        transaction_date,
        posting_date,
        description,
        reference,
        debit_amount,
        credit_amount,
        running_balance,
        source_document_type,
        source_document_id
      ) VALUES (
        line_rec.account_id,
        NEW.id,
        line_rec.id,
        NEW.entry_date,
        NEW.posting_date,
        line_rec.description,
        NEW.reference_number,
        line_rec.debit_amount,
        line_rec.credit_amount,
        running_balance,
        NEW.source_document_type,
        NEW.source_document_id
      );
    END LOOP;
    
    -- Update posting timestamp
    UPDATE journal_entries 
    SET posted_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | O       | 17         |
| update_journal_entries_updated_at            | journal_entries            | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| audit_journal_entry_lines                    | journal_entry_lines        | UPDATE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_journal_entry_lines                    | journal_entry_lines        | DELETE | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| audit_journal_entry_lines                    | journal_entry_lines        | INSERT | create_audit_trail                   | 
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| update_journal_entry_lines_updated_at        | journal_entry_lines        | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| objects_delete_delete_prefix                 | objects                    | DELETE | delete_prefix_hierarchy_trigger      | 
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 9          |
| objects_insert_create_prefix                 | objects                    | INSERT | objects_insert_prefix_trigger        | 
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | O       | 7          |
| objects_update_create_prefix                 | objects                    | UPDATE | objects_update_prefix_trigger        | 
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | O       | 19         |
| update_objects_updated_at                    | objects                    | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| prefixes_create_hierarchy                    | prefixes                   | INSERT | prefixes_insert_trigger              | 
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | O       | 7          |
| prefixes_delete_hierarchy                    | prefixes                   | DELETE | delete_prefix_hierarchy_trigger      | 
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | O       | 9          |
| trg_products_set_updated_at                  | products                   | UPDATE | set_updated_at                       | 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| trg_products_updated_at                      | products                   | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| update_purchase_order_items_updated_at       | purchase_order_items       | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| sync_sales_order_totals_delete               | sales_order_items          | DELETE | sync_sales_order_totals              | 
DECLARE
    order_original_price DECIMAL(10,2);
    order_final_price DECIMAL(10,2);
    order_discount_amount DECIMAL(10,2);
BEGIN
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0)
    INTO order_original_price, order_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_final_price;
    
    -- Update the parent sales order
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | O       | 9          |
| sync_sales_order_totals_insert               | sales_order_items          | INSERT | sync_sales_order_totals              | 
DECLARE
    order_original_price DECIMAL(10,2);
    order_final_price DECIMAL(10,2);
    order_discount_amount DECIMAL(10,2);
BEGIN
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0)
    INTO order_original_price, order_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_final_price;
    
    -- Update the parent sales order
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | O       | 5          |
| sync_sales_order_totals_update               | sales_order_items          | UPDATE | sync_sales_order_totals              | 
DECLARE
    order_original_price DECIMAL(10,2);
    order_final_price DECIMAL(10,2);
    order_discount_amount DECIMAL(10,2);
BEGIN
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0)
    INTO order_original_price, order_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_final_price;
    
    -- Update the parent sales order
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | O       | 17         |
| sales_order_analytics_trigger                | sales_orders               | INSERT | trigger_analytics_update             | 
BEGIN
    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)
    PERFORM pg_notify('analytics_refresh', 'scheduled');
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 29         |
| sales_order_analytics_trigger                | sales_orders               | DELETE | trigger_analytics_update             | 
BEGIN
    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)
    PERFORM pg_notify('analytics_refresh', 'scheduled');
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 29         |
| sales_order_analytics_trigger                | sales_orders               | UPDATE | trigger_analytics_update             | 
BEGIN
    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)
    PERFORM pg_notify('analytics_refresh', 'scheduled');
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 29         |
| trg_sales_orders_set_updated_at              | sales_orders               | UPDATE | set_updated_at                       | 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| trg_sales_orders_updated_at                  | sales_orders               | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| apply_stock_adjustment_trigger               | stock_adjustments          | INSERT | apply_stock_adjustment               | 
BEGIN
  UPDATE inventory_items
  SET quantity = NEW.quantity_after,
      updated_at = NOW()
  WHERE id = NEW.inventory_item_id;
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 5          |
| stock_adjustments_updated_at_trigger         | stock_adjustments          | UPDATE | update_stock_adjustments_updated_at  | 
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| tr_check_filters                             | subscription               | INSERT | subscription_check_filters           | 
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
     | O       | 23         |
| tr_check_filters                             | subscription               | UPDATE | subscription_check_filters           | 
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
     | O       | 23         |
| trg_suppliers_set_updated_at                 | suppliers                  | UPDATE | set_updated_at                       | 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| trg_suppliers_updated_at                     | suppliers                  | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| update_support_tickets_updated_at            | support_tickets            | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| update_user_notification_settings_updated_at | user_notification_settings | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |
| trigger_update_po_payment_status             | vendor_payment_history     | DELETE | update_purchase_order_payment_status | 
BEGIN
    UPDATE purchase_orders 
    SET payment_status = CASE 
        WHEN paid_amount = 0 THEN 'unpaid'
        WHEN paid_amount >= total THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'
        ELSE payment_status
    END
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| trigger_update_po_payment_status             | vendor_payment_history     | UPDATE | update_purchase_order_payment_status | 
BEGIN
    UPDATE purchase_orders 
    SET payment_status = CASE 
        WHEN paid_amount = 0 THEN 'unpaid'
        WHEN paid_amount >= total THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'
        ELSE payment_status
    END
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| trigger_update_po_payment_status             | vendor_payment_history     | INSERT | update_purchase_order_payment_status | 
BEGIN
    UPDATE purchase_orders 
    SET payment_status = CASE 
        WHEN paid_amount = 0 THEN 'unpaid'
        WHEN paid_amount >= total THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'
        ELSE payment_status
    END
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | O       | 29         |
| trigger_update_vendor_bill_status            | vendor_payment_history     | INSERT | update_vendor_bill_status            | 
BEGIN
    UPDATE vendor_bills 
    SET status = CASE 
        WHEN paid_amount = 0 THEN 'pending'
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'
        ELSE status
    END,
    updated_at = now()
    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | O       | 29         |
| trigger_update_vendor_bill_status            | vendor_payment_history     | UPDATE | update_vendor_bill_status            | 
BEGIN
    UPDATE vendor_bills 
    SET status = CASE 
        WHEN paid_amount = 0 THEN 'pending'
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'
        ELSE status
    END,
    updated_at = now()
    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | O       | 29         |
| trigger_update_vendor_bill_status            | vendor_payment_history     | DELETE | update_vendor_bill_status            | 
BEGIN
    UPDATE vendor_bills 
    SET status = CASE 
        WHEN paid_amount = 0 THEN 'pending'
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'
        ELSE status
    END,
    updated_at = now()
    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);

    RETURN COALESCE(NEW, OLD);
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | O       | 29         |
| trg_work_orders_set_updated_at               | work_orders                | UPDATE | set_updated_at                       | 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | O       | 19         |
| trg_work_orders_updated_at                   | work_orders                | UPDATE | update_updated_at_column             | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | O       | 19         |