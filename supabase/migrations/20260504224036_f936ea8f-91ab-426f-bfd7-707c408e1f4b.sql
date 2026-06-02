UPDATE property_pushes
SET status = 'lease_signed', updated_at = NOW()
WHERE id = 'cc6a6edd-a6b1-4b02-a931-4de2941de5c1';

UPDATE property_pushes
SET status = 'denied',
    notes = COALESCE(NULLIF(notes,'') || E'\n','') || 'Auto-closed: lease signed with another applicant',
    updated_at = NOW()
WHERE id = '8906781f-3612-4d98-adb9-06206dbd61ad';