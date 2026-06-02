-- Add comprehensive test data for payment history demonstration

-- First, get the property ID for 115 Monteith Cir
DO $$
DECLARE
    target_property_id UUID;
    demo_tenant_id UUID;
    demo_landlord_id UUID;
BEGIN
    -- Get the property ID
    SELECT id INTO target_property_id 
    FROM properties 
    WHERE address = '115 Monteith Cir' 
    LIMIT 1;
    
    -- Get demo tenant and landlord IDs
    SELECT id INTO demo_tenant_id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO demo_landlord_id FROM profiles WHERE user_type = 'individual_owner' ORDER BY created_at DESC LIMIT 1;
    
    IF target_property_id IS NOT NULL AND demo_tenant_id IS NOT NULL THEN
        -- Add diverse HAP payments for last 6 months
        INSERT INTO hap_payments (
            property_id, tenant_id, expected_amount, actual_amount, 
            payment_period_start, payment_period_end, payment_date, 
            payment_status, payment_method, notes, is_verified, verified_at
        ) VALUES
        -- January 2025 - Completed HAP payment
        (target_property_id, demo_tenant_id, 900.00, 900.00, 
         '2025-01-01', '2025-01-31', '2025-01-03',
         'received', 'ach', 'On-time HAP payment via ACH', true, '2025-01-03 10:30:00'),
        
        -- December 2024 - Late HAP payment
        (target_property_id, demo_tenant_id, 900.00, 900.00,
         '2024-12-01', '2024-12-31', '2024-12-08',
         'received', 'ach', 'Late HAP payment - received 8 days after due', true, '2024-12-08 14:15:00'),
        
        -- November 2024 - Partial HAP payment
        (target_property_id, demo_tenant_id, 900.00, 750.00,
         '2024-11-01', '2024-11-30', '2024-11-05',
         'partial', 'ach', 'Partial HAP payment - $150 shortfall', true, '2024-11-05 09:45:00'),
        
        -- October 2024 - Completed HAP payment  
        (target_property_id, demo_tenant_id, 900.00, 900.00,
         '2024-10-01', '2024-10-31', '2024-10-02',
         'received', 'ach', 'On-time HAP payment', true, '2024-10-02 11:20:00'),
        
        -- September 2024 - Processing HAP payment
        (target_property_id, demo_tenant_id, 900.00, null,
         '2024-09-01', '2024-09-30', null,
         'processing', 'ach', 'HAP payment in processing', false, null),
        
        -- August 2024 - Completed HAP payment
        (target_property_id, demo_tenant_id, 900.00, 900.00,
         '2024-08-01', '2024-08-31', '2024-08-01',
         'received', 'ach', 'Early HAP payment received', true, '2024-08-01 08:30:00');
        
        -- Add diverse tenant rent payments
        INSERT INTO rent_payments (
            property_id, tenant_id, amount, due_date, payment_date,
            status, payment_method, stripe_payment_intent_id, 
            late_fee_amount, days_late, notes
        ) VALUES
        -- January 2025 - On-time tenant payment
        (target_property_id, demo_tenant_id, 500.00, '2025-01-01', '2025-01-01',
         'completed', 'stripe', 'pi_3QTest123456789', 0.00, 0, 'On-time tenant portion payment'),
        
        -- December 2024 - Late tenant payment with fee
        (target_property_id, demo_tenant_id, 525.00, '2024-12-01', '2024-12-10',
         'completed', 'stripe', 'pi_3QTest987654321', 25.00, 9, 'Late tenant payment with $25 late fee'),
        
        -- November 2024 - Partial tenant payment
        (target_property_id, demo_tenant_id, 350.00, '2024-11-01', '2024-11-05',
         'completed', 'ach', null, 0.00, 4, 'Partial tenant payment - $150 remaining'),
        
        -- November 2024 - Remaining tenant payment
        (target_property_id, demo_tenant_id, 150.00, '2024-11-01', '2024-11-15',
         'completed', 'check', null, 25.00, 14, 'Remaining tenant payment with late fee'),
        
        -- October 2024 - On-time tenant payment
        (target_property_id, demo_tenant_id, 500.00, '2024-10-01', '2024-09-30',
         'completed', 'stripe', 'pi_3QTest456789123', 0.00, 0, 'Early tenant payment'),
        
        -- September 2024 - Pending tenant payment
        (target_property_id, demo_tenant_id, 500.00, '2024-09-01', null,
         'pending', 'autopay', null, 0.00, 0, 'Scheduled autopay payment'),
        
        -- August 2024 - On-time tenant payment
        (target_property_id, demo_tenant_id, 500.00, '2024-08-01', '2024-08-01',
         'completed', 'stripe', 'pi_3QTest789123456', 0.00, 0, 'On-time tenant payment'),
        
        -- July 2024 - Multiple partial payments
        (target_property_id, demo_tenant_id, 200.00, '2024-07-01', '2024-07-01',
         'completed', 'cash', null, 0.00, 0, 'First partial cash payment'),
        
        (target_property_id, demo_tenant_id, 300.00, '2024-07-01', '2024-07-08',
         'completed', 'stripe', 'pi_3QTest321654987', 25.00, 7, 'Second partial payment with late fee');
        
        RAISE NOTICE 'Successfully added comprehensive payment test data for property: %', target_property_id;
    ELSE
        RAISE NOTICE 'Could not find required property or tenant IDs';
    END IF;
END $$;