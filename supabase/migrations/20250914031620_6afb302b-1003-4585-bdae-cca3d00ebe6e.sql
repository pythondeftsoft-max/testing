-- Add sample rent payment data to test accounts receivable system
DO $$
DECLARE
    prop_record RECORD;
    months_back INTEGER;
    due_date_calc DATE;
BEGIN
    -- For each property in the specific portfolio, create some rent payment history
    FOR prop_record IN 
        SELECT p.id, p.monthly_rent, p.lease_start_date,
               pa.tenant_id, p.address
        FROM properties p
        LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
        WHERE p.portfolio_id = '7c866586-a38f-4758-9558-b69ef8ca9ce8'
        AND p.monthly_rent > 0
        AND p.deleted_at IS NULL
    LOOP
        -- Create rent payments for the last 3 months to generate some outstanding balances
        FOR months_back IN 0..2 LOOP
            due_date_calc := (CURRENT_DATE - INTERVAL '1 month' * months_back)::DATE;
            
            -- Skip if before lease start
            IF prop_record.lease_start_date IS NOT NULL AND due_date_calc < prop_record.lease_start_date THEN
                CONTINUE;
            END IF;
            
            -- Create rent payment record (varied payment scenarios)
            INSERT INTO rent_payments (
                property_id,
                tenant_id, 
                amount,
                due_date,
                payment_date,
                status,
                days_late
            ) VALUES (
                prop_record.id,
                prop_record.tenant_id,
                prop_record.monthly_rent,
                due_date_calc,
                CASE 
                    -- First month: paid on time
                    WHEN months_back = 2 THEN due_date_calc
                    -- Second month: paid late
                    WHEN months_back = 1 THEN due_date_calc + 10
                    -- Current month: unpaid (leave payment_date null)
                    ELSE NULL
                END,
                CASE 
                    WHEN months_back = 2 THEN 'completed'
                    WHEN months_back = 1 THEN 'late'
                    ELSE 'pending'
                END,
                CASE 
                    WHEN months_back = 2 THEN 0
                    WHEN months_back = 1 THEN 10
                    ELSE (CURRENT_DATE - due_date_calc)::INTEGER
                END
            ) ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- Add some late fees for overdue properties
        IF random() > 0.5 THEN
            INSERT INTO accounts_receivable_details (
                property_id,
                tenant_id,
                balance_type,
                amount,
                due_date,
                description
            ) VALUES (
                prop_record.id,
                prop_record.tenant_id,
                'late_fees',
                50.00,
                CURRENT_DATE - INTERVAL '5 days',
                'Late fee for overdue rent'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Update outstanding balances for all properties
SELECT update_property_outstanding_balances();