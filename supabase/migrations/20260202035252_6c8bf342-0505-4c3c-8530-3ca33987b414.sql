-- Add coordinates for properties missing lat/lon (city centroids)

-- Dallas property (75243 centroid)
UPDATE properties SET latitude = 32.917, longitude = -96.737 
WHERE id = 'f9e03220-29dc-4ecf-b44c-daee6956d236' AND (latitude IS NULL OR longitude IS NULL);

-- Houston property (77033 centroid)  
UPDATE properties SET latitude = 29.676, longitude = -95.305
WHERE id = 'd3a42773-bdf2-45ff-a3a9-016b8ea3605d' AND (latitude IS NULL OR longitude IS NULL);

-- Forney property (75126 centroid)
UPDATE properties SET latitude = 32.748, longitude = -96.472
WHERE id = 'df4f7ee7-4387-467e-b28c-0b8875b133ca' AND (latitude IS NULL OR longitude IS NULL);