-- Insert sample maintenance requests for testing (corrected categories and status)
INSERT INTO public.maintenance_requests (
  tenant_id,
  property_id,
  category,
  priority,
  status,
  title,
  description,
  created_at,
  updated_at
) VALUES
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'plumbing',
    'Low',
    'completed',
    'Kitchen Faucet Dripping',
    'The kitchen faucet has been dripping constantly for the past few days. It''s wasting water and making noise at night.',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'appliance_repair',
    'High',
    'in_progress',
    'Refrigerator Not Cooling Properly',
    'The refrigerator is not maintaining the correct temperature. Food is starting to spoil. This needs urgent attention.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'electrical',
    'Medium',
    'pending',
    'Bedroom Light Fixture Flickering',
    'The overhead light in the master bedroom flickers intermittently. May be a wiring issue.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'plumbing',
    'Medium',
    'completed',
    'Garbage Disposal Jammed',
    'The garbage disposal was jammed and making grinding noises. Unable to use it.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'hvac',
    'High',
    'in_progress',
    'Air Conditioning Not Working Effectively',
    'The AC is running but not cooling the apartment adequately. Temperature stays around 78°F even when set to 68°F.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '8 hours'
  ),
  (
    '03e26106-4179-4b55-bd38-66c5414e8ba2',
    '1abdf610-aa92-4789-9872-99d684b9053a',
    'general_handyman',
    'Low',
    'pending',
    'Loose Bathroom Door Handle',
    'The bathroom door handle is loose and wobbles when used. Needs tightening or replacement.',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  );