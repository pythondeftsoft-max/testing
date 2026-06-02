import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract unique image ID/hash from URL to deduplicate same image from different CDN paths
function extractImageId(url: string): string {
  // Trulia/Zillow pattern: /fp/{hash}-full.webp or /fp/{hash}-cc_ft_960.webp
  const hashMatch = url.match(/\/fp\/([a-zA-Z0-9]+)[-\.]/);
  if (hashMatch) {
    return hashMatch[1]; // Return just the hash
  }
  
  // Zillowstatic pattern with hash in different position
  const zillowMatch = url.match(/zillowstatic\.com\/[^\/]+\/([a-zA-Z0-9]+)[-\.]/);
  if (zillowMatch) {
    return zillowMatch[1];
  }
  
  // For other URLs, use the filename without size suffixes as ID
  const filenameMatch = url.match(/\/([^\/]+)\.(jpg|jpeg|png|webp|gif)$/i);
  if (filenameMatch) {
    // Remove common size suffixes to get base ID
    return filenameMatch[1]
      .replace(/-cc_ft_\d+/, '')
      .replace(/-p_[a-z]/, '')
      .replace(/-uncropped[^-]*/, '')
      .replace(/-full/, '')
      .replace(/_\d+x\d+/, '')
      .replace(/thumbs_\d+/, '');
  }
  
  // Fallback: use full URL
  return url;
}

// Score image quality - higher is better
function getImageQuality(url: string): number {
  let score = 0;
  
  // Prefer higher quality thumbs
  if (url.includes('thumbs_5')) score += 50;
  else if (url.includes('thumbs_4')) score += 40;
  else if (url.includes('thumbs_3')) score += 30;
  else if (url.includes('thumbs_2')) score += 20;
  else if (url.includes('thumbs_1')) score += 10;
  
  // Prefer full/uncropped versions
  if (url.includes('-full.')) score += 100;
  if (url.includes('-uncropped')) score += 90;
  if (url.includes('1536_1152')) score += 80;
  if (url.includes('1344_1008')) score += 70;
  
  // Penalize small sizes
  if (url.includes('_xs') || url.includes('50x50') || url.includes('100x100')) score -= 50;
  if (url.includes('_thumb') || url.includes('_sm')) score -= 30;
  
  return score;
}

// Deduplicate images by hash, keeping highest quality version
function deduplicateImagesByHash(images: string[]): string[] {
  const imagesByHash = new Map<string, string>();
  
  for (const url of images) {
    const hash = extractImageId(url);
    const existing = imagesByHash.get(hash);
    
    if (!existing) {
      imagesByHash.set(hash, url);
    } else {
      // Keep the higher quality version
      const urlQuality = getImageQuality(url);
      const existingQuality = getImageQuality(existing);
      if (urlQuality > existingQuality) {
        imagesByHash.set(hash, url);
      }
    }
  }
  
  return Array.from(imagesByHash.values());
}

// Property data extraction schema for Firecrawl
const propertySchema = {
  type: "object",
  properties: {
    address: {
      type: "object",
      properties: {
        street: { type: "string", description: "Street address of the property" },
        city: { type: "string", description: "City name" },
        state: { type: "string", description: "State abbreviation (e.g., CA, TX)" },
        zip: { type: "string", description: "ZIP code" }
      }
    },
    rent: { type: "number", description: "Monthly rent in dollars" },
    bedrooms: { type: "number", description: "Number of bedrooms" },
    bathrooms: { type: "number", description: "Number of bathrooms" },
    squareFeet: { type: "number", description: "Square footage of the property" },
    description: { type: "string", description: "Full property description text" },
    propertyType: { 
      type: "string", 
      description: "Type of property: house, apartment, townhouse, condo, or mobile_home" 
    },
    amenities: {
      type: "array",
      items: { type: "string" },
      description: "List of amenities like dishwasher, air conditioning, pool, gym, parking, laundry, etc."
    },
    petPolicy: {
      type: "object",
      properties: {
        allowed: { type: "boolean", description: "Whether pets are allowed" },
        deposit: { type: "number", description: "Pet deposit amount" },
        monthlyFee: { type: "number", description: "Monthly pet fee" },
        restrictions: { type: "string", description: "Pet restrictions or notes" }
      }
    },
    images: {
      type: "array",
      items: { type: "string" },
      description: "URLs of all property images"
    },
    yearBuilt: { type: "number", description: "Year the property was built" },
    utilitiesIncluded: {
      type: "array",
      items: { type: "string" },
      description: "List of utilities included in rent"
    },
    availableDate: { type: "string", description: "Move-in or availability date" },
    contactInfo: {
      type: "object",
      properties: {
        name: { type: "string", description: "Landlord or property manager name" },
        phone: { type: "string", description: "Contact phone number" },
        email: { type: "string", description: "Contact email address" }
      }
    }
  }
};

// Amenity mapping from scraped text to our system keys
const AMENITY_MAPPINGS: Record<string, string[]> = {
  'air_conditioning': ['air conditioning', 'a/c', 'ac', 'central air', 'hvac', 'cooling'],
  'heating': ['heating', 'heat', 'central heat', 'gas heat', 'electric heat'],
  'furnished': ['furnished', 'fully furnished'],
  'balcony_patio': ['balcony', 'patio', 'deck', 'terrace', 'outdoor space'],
  'yard_garden': ['yard', 'garden', 'backyard', 'lawn', 'private yard'],
  'fireplace': ['fireplace', 'wood burning'],
  'walk_in_closets': ['walk-in closet', 'walk in closet', 'large closet'],
  'ceiling_fans': ['ceiling fan', 'ceiling fans'],
  'cable_ready': ['cable ready', 'cable included', 'cable tv'],
  'high_speed_internet': ['internet', 'wifi', 'high speed internet', 'fiber'],
  'dishwasher': ['dishwasher'],
  'microwave': ['microwave'],
  'refrigerator': ['refrigerator', 'fridge'],
  'stove_oven': ['stove', 'oven', 'range', 'gas stove', 'electric stove'],
  'garbage_disposal': ['garbage disposal', 'disposal'],
  'in_unit_laundry': ['in-unit laundry', 'in unit laundry', 'washer/dryer in unit', 'w/d in unit'],
  'shared_laundry': ['shared laundry', 'laundry on site', 'laundry facility', 'community laundry'],
  'laundry_hookups': ['laundry hookups', 'washer dryer hookups', 'w/d hookups'],
  'washer': ['washer', 'washing machine'],
  'dryer': ['dryer'],
  'hardwood_floors': ['hardwood', 'hardwood floors', 'wood floors'],
  'carpet': ['carpet', 'carpeted', 'wall to wall carpet'],
  'tile_floors': ['tile', 'tile floors', 'ceramic tile'],
  'parking': ['parking', 'parking available', 'off street parking', 'street parking'],
  'garage': ['garage', 'attached garage', 'detached garage', 'car garage'],
  'parking_space': ['parking space', 'assigned parking', 'covered parking'],
  'gym_fitness': ['gym', 'fitness', 'fitness center', 'workout room', 'exercise room'],
  'pool': ['pool', 'swimming pool', 'community pool'],
  'storage_unit': ['storage', 'storage unit', 'extra storage', 'basement storage'],
  'elevator': ['elevator', 'elevators'],
  'security_system': ['security', 'security system', 'gated', 'gated community', 'controlled access'],
  'wheelchair_accessible': ['wheelchair', 'accessible', 'ada', 'handicap accessible'],
  'pet_friendly': ['pets allowed', 'pet friendly', 'cats allowed', 'dogs allowed', 'pets ok'],
  'smoking_allowed': ['smoking allowed'],
};

function mapAmenities(scrapedAmenities: string[]): string[] {
  const mappedKeys = new Set<string>();
  
  for (const scraped of scrapedAmenities) {
    const lowerScraped = scraped.toLowerCase().trim();
    
    for (const [key, variations] of Object.entries(AMENITY_MAPPINGS)) {
      if (variations.some(v => lowerScraped.includes(v) || v.includes(lowerScraped))) {
        mappedKeys.add(key);
      }
    }
  }
  
  return Array.from(mappedKeys);
}

function normalizePropertyType(type: string | null | undefined): string {
  if (!type) return 'apartment';
  
  const lower = type.toLowerCase();
  if (lower.includes('house') || lower.includes('single family') || lower.includes('home')) {
    return 'house';
  }
  if (lower.includes('townhouse') || lower.includes('town house') || lower.includes('townhome')) {
    return 'townhouse';
  }
  if (lower.includes('mobile') || lower.includes('manufactured')) {
    return 'mobile_home';
  }
  if (lower.includes('condo')) {
    return 'apartment'; // Map condo to apartment in our system
  }
  return 'apartment';
}

// Extract the PRIMARY listing's photos directly from the structured data
// This is the most accurate method - gets exactly the listing's photos without related properties
function extractPrimaryListingPhotos(html: string, sourceUrl: string): { photos: string[], count: number } | null {
  // Extract zpid from URL (Trulia: 27138313, Zillow similar)
  // URLs look like: /p/ca/los-angeles/.../2050219619 or /homedetails/.../12345678_zpid/
  const zpidPatterns = [
    /\/(\d{7,12})(?:[?#\/]|$)/,  // Generic path ending with large number
    /(\d{7,12})_zpid/,            // Zillow zpid pattern
    /-(\d{7,12})$/,               // Trulia ending pattern
  ];
  
  let primaryZpid: string | null = null;
  for (const pattern of zpidPatterns) {
    const match = sourceUrl.match(pattern);
    if (match) {
      primaryZpid = match[1];
      break;
    }
  }
  console.log('Primary listing zpid:', primaryZpid);
  
  // Find the __NEXT_DATA__ script
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!nextDataMatch) {
    console.log('No __NEXT_DATA__ found for primary listing extraction');
    return null;
  }
  
  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const photoArrayKeys = ['photos', 'responsivePhotos', 'originalPhotos', 'hiResPhotos', 
                            'desktopWebHighResPhotos', 'galleryPhotos', 'media'];
    
    // Helper function to find a property object with photos
    const findPropertyWithPhotos = (obj: unknown, depth = 0): Record<string, unknown> | null => {
      if (depth > 5 || !obj || typeof obj !== 'object') return null;
      
      const record = obj as Record<string, unknown>;
      
      // Check if this object directly has a photos array with enough items
      for (const key of photoArrayKeys) {
        if (record[key] && Array.isArray(record[key]) && (record[key] as unknown[]).length > 3) {
          console.log(`findPropertyWithPhotos: Found ${key} with ${(record[key] as unknown[]).length} items at depth ${depth}`);
          return record;
        }
      }
      
      // Check nested objects (but skip obvious non-property keys)
      const skipKeys = ['buildingQuery', 'searchQuery', 'nearby', 'similar', 'related', 'seo', 'abTests', 'tracking'];
      for (const [key, value] of Object.entries(record)) {
        if (skipKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) continue;
        if (typeof value === 'object' && value !== null) {
          const found = findPropertyWithPhotos(value, depth + 1);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    let property: Record<string, unknown> | null = null;
    
    // PATH 1: Zillow gdpClientCache (encoded JSON blob)
    const cacheStr = nextData?.props?.pageProps?.componentProps?.gdpClientCache;
    if (cacheStr) {
      console.log('Found gdpClientCache (Zillow path)');
      const cache = JSON.parse(cacheStr);
      const cacheKeys = Object.keys(cache);
      console.log('gdpClientCache has', cacheKeys.length, 'entries');
      
      // Find the cache entry for THIS property (by zpid if available)
      let targetEntry: Record<string, unknown> | null = null;
      
      for (const [key, entry] of Object.entries(cache)) {
        if (primaryZpid && key.includes(primaryZpid)) {
          targetEntry = entry as Record<string, unknown>;
          console.log('Found primary listing by zpid in key:', key.slice(0, 60));
          break;
        }
      }
      
      // If no zpid match, use first entry (usually the primary listing)
      if (!targetEntry && cacheKeys.length > 0) {
        targetEntry = cache[cacheKeys[0]] as Record<string, unknown>;
        console.log('Using first cache entry as primary listing');
      }
      
      if (targetEntry) {
        property = targetEntry.property as Record<string, unknown> | undefined || null;
      }
    }
    
    // PATH 2: Trulia direct pageProps paths
    if (!property) {
      console.log('No Zillow gdpClientCache, trying Trulia paths...');
      const pageProps = nextData?.props?.pageProps;
      
      if (pageProps) {
        // Trulia stores property data in various locations
        const truliaPropertyPaths = [
          pageProps?.home,
          pageProps?.property,
          pageProps?.listing,
          pageProps?.propertyDetails,
          pageProps?.componentProps?.home,
          pageProps?.componentProps?.property,
        ];
        
        for (const path of truliaPropertyPaths) {
          if (path && typeof path === 'object') {
            // Check if this object has photos directly
            for (const key of photoArrayKeys) {
              if ((path as Record<string, unknown>)[key] && 
                  Array.isArray((path as Record<string, unknown>)[key]) &&
                  ((path as Record<string, unknown>)[key] as unknown[]).length > 3) {
                console.log(`Found Trulia photos at direct path with ${key}`);
                property = path as Record<string, unknown>;
                break;
              }
            }
            if (property) break;
          }
        }
        
        // Last resort: Search recursively in pageProps
        if (!property) {
          console.log('Searching pageProps recursively for photos...');
          property = findPropertyWithPhotos(pageProps);
        }
      }
    }
    
    if (!property) {
      console.log('No property object found in any path');
      return null;
    }
    
    // Check for separate hero/cover photo (Trulia often stores this separately from photos array)
    const heroImageKeys = ['heroImage', 'coverPhoto', 'primaryPhoto', 'mainPhoto', 
                          'streetViewTileImageUrlMediumAddress', 'hdpUrl', 'imgSrc'];
    let heroUrl: string | null = null;

    for (const key of heroImageKeys) {
      const heroData = property[key];
      if (heroData) {
        // Handle string URL directly
        if (typeof heroData === 'string' && heroData.includes('http') && 
            (heroData.includes('.jpg') || heroData.includes('.jpeg') || 
             heroData.includes('.png') || heroData.includes('.webp'))) {
          heroUrl = heroData;
          console.log(`Found hero image in ${key} (direct URL): ${heroUrl.substring(0, 80)}...`);
          break;
        }
        // Handle object with url/src property
        if (typeof heroData === 'object') {
          const heroObj = heroData as Record<string, unknown>;
          const possibleUrl = (heroObj.url || heroObj.src || heroObj.highResLink || heroObj.fullUrl) as string;
          if (possibleUrl && possibleUrl.includes('http')) {
            heroUrl = possibleUrl;
            console.log(`Found hero image in ${key} (object): ${heroUrl.substring(0, 80)}...`);
            break;
          }
        }
      }
    }
    
    // photoArrayKeys already declared above - reuse it
    
    let photosArray: Array<Record<string, unknown>> | null = null;
    let foundKey = '';
    for (const key of photoArrayKeys) {
      if (property[key] && Array.isArray(property[key]) && (property[key] as unknown[]).length > 0) {
        photosArray = property[key] as Array<Record<string, unknown>>;
        foundKey = key;
        console.log(`Found photos in property.${key} with ${photosArray.length} items`);
        break;
      }
    }
    
    if (!photosArray || photosArray.length === 0) {
      console.log('No photos array found in any known location. Available keys:', Object.keys(property).join(', '));
      return null;
    }
    
    // Get the expected photo count from metadata (Zillow provides this)
    const photoCount = (property.photoCount as number) || photosArray.length;
    console.log(`Expected photoCount: ${photoCount}, found array: ${foundKey} with ${photosArray.length} items`);
    
    // Extract photo URLs - handle different structures used by Zillow/Trulia
    const photos: string[] = [];
    for (const photo of photosArray) {
      let url: string | null = null;
      
      // Structure 1: mixedSources.webp/jpeg (common in property.photos)
      const mixedSources = photo.mixedSources as Record<string, Array<{url: string}>> | undefined;
      if (mixedSources) {
        const webpUrls = mixedSources?.webp;
        const jpegUrls = mixedSources?.jpeg;
        if (webpUrls && webpUrls.length > 0) {
          url = webpUrls[webpUrls.length - 1]?.url || webpUrls[0]?.url;
        } else if (jpegUrls && jpegUrls.length > 0) {
          url = jpegUrls[jpegUrls.length - 1]?.url || jpegUrls[0]?.url;
        }
      }
      
      // Structure 2: Direct url property (responsivePhotos, originalPhotos)
      if (!url && typeof photo.url === 'string') {
        url = photo.url;
      }
      
      // Structure 3: Nested in subphotoUrls or urls array
      if (!url && photo.subphotoUrls && Array.isArray(photo.subphotoUrls)) {
        const subUrls = photo.subphotoUrls as Array<{url?: string} | string>;
        for (const sub of subUrls) {
          if (typeof sub === 'string') {
            url = sub;
            break;
          } else if (sub?.url) {
            url = sub.url;
            break;
          }
        }
      }
      
      // Structure 4: highResLink or fullUrl
      if (!url && typeof photo.highResLink === 'string') {
        url = photo.highResLink;
      }
      if (!url && typeof photo.fullUrl === 'string') {
        url = photo.fullUrl;
      }
      
      // Structure 5: Check for nested photo objects with src
      if (!url && typeof photo.src === 'string') {
        url = photo.src;
      }
      
      // Only add valid, non-empty URLs that contain http
      if (url && url.trim() !== '' && url.includes('http') && !photos.includes(url)) {
        photos.push(url);
      }
    }
    
    // Prepend hero image if found and not already in the array
    if (heroUrl && !photos.includes(heroUrl)) {
      photos.unshift(heroUrl);
      console.log('Prepended hero image to photos array');
    }
    
    console.log(`Extracted ${photos.length} unique photos from primary listing (${foundKey})`);
    return { photos, count: photoCount };
  } catch (e) {
    console.log('Failed to extract primary listing photos:', e);
  }
  return null;
}

// Extract images from embedded JSON data (__NEXT_DATA__, schema.org, etc.)
// This is where Trulia/Zillow store ALL gallery images - used as FALLBACK
function extractImagesFromEmbeddedJson(html: string, sourceUrl?: string): string[] {
  const images: string[] = [];
  
  // Helper to recursively find image URLs in nested objects
  const findImageUrls = (obj: unknown, depth = 0): void => {
    if (depth > 25 || !obj) return; // Increased depth for deeply nested structures
    
    if (typeof obj === 'string') {
      // Check if it's an image URL (Zillow/Trulia specific patterns)
      if ((obj.includes('zillowstatic') || obj.includes('trulia') || obj.includes('photos.') || obj.includes('streeteasy')) && 
          obj.match(/\.(jpg|jpeg|png|webp)/i) &&
          !obj.includes('icon') && !obj.includes('logo') && !obj.includes('avatar')) {
        images.push(obj);
      }
      
      // KEY FIX: Check if this string is actually a JSON-encoded string (double-encoded)
      if (obj.startsWith('{') && obj.includes('photos')) {
        try {
          const parsed = JSON.parse(obj);
          console.log('Found nested JSON string, parsing...');
          findImageUrls(parsed, depth + 1);
        } catch {
          // Not valid JSON, ignore
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => findImageUrls(item, depth + 1));
    } else if (typeof obj === 'object' && obj !== null) {
      const record = obj as Record<string, unknown>;
      
      // Prioritize known photo array keys first
      const photoKeys = ['photos', 'images', 'media', 'photoUrls', 'galleryPhotos', 
                         'propertyPhotos', 'hiResPhotos', 'hdpPhotos', 'mixedSources',
                         'responsivePhotos', 'desktopWebHighResPhoto', 'webp', 'jpeg',
                         'originalPhotos', 'photoCollection', 'imageUrls', 'carouselPhotos'];
      
      for (const [key, value] of Object.entries(record)) {
        // Check if this is the gdpClientCache which is a STRINGIFIED JSON
        if (key === 'gdpClientCache' && typeof value === 'string') {
          console.log('Found gdpClientCache stringified JSON, parsing...');
          try {
            const cacheData = JSON.parse(value);
            // The cache keys are usually URLs or property IDs, iterate through all
            for (const cacheEntry of Object.values(cacheData)) {
              findImageUrls(cacheEntry, depth + 1);
            }
          } catch (e) {
            console.log('Failed to parse gdpClientCache:', e);
          }
          continue;
        }
        
        // Look for photo-related keys
        if (photoKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase()))) {
          findImageUrls(value, depth + 1);
        }
      }
      
      // Also search all values to catch nested structures
      for (const value of Object.values(record)) {
        if (typeof value === 'object') {
          findImageUrls(value, depth + 1);
        }
      }
    }
  };
  
// Pattern 1: Next.js __NEXT_DATA__ (Trulia/Zillow use this heavily)
  // More robust regex that handles multiline JSON
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      console.log('Found __NEXT_DATA__, parsing for images...');
      
      const pageProps = nextData?.props?.pageProps;
      
      // NEW: Check for Trulia hero/cover photo first before collecting all photos
      const truliaHeroPaths = [
        pageProps?.home?.media?.heroImage,
        pageProps?.home?.heroImageUrl,
        pageProps?.home?.media?.photos?.[0],
        pageProps?.listing?.photos?.[0],
        pageProps?.property?.primaryPhoto,
        pageProps?.data?.property?.photos?.[0],
        pageProps?.componentProps?.home?.media?.photos?.[0],
        pageProps?.initialState?.media?.photos?.[0],
      ];

      let fallbackHeroUrl: string | null = null;
      for (const heroData of truliaHeroPaths) {
        if (heroData) {
          if (typeof heroData === 'string' && heroData.includes('http')) {
            fallbackHeroUrl = heroData;
            console.log('Found Trulia hero image (direct):', fallbackHeroUrl.substring(0, 80));
            break;
          }
          if (typeof heroData === 'object') {
            const heroObj = heroData as Record<string, unknown>;
            // Check various URL structures including Trulia's mixedSources
            const mixedSources = heroObj.mixedSources as Record<string, unknown[]> | undefined;
            const jpegSources = mixedSources?.jpeg as Array<{ url?: string }> | undefined;
            const url = (heroObj.url || heroObj.src || heroObj.highResLink || 
                        heroObj.fullUrl || jpegSources?.[jpegSources.length - 1]?.url) as string;
            if (url && url.includes('http')) {
              fallbackHeroUrl = url;
              console.log('Found Trulia hero image (object):', fallbackHeroUrl.substring(0, 80));
              break;
            }
          }
        }
      }
      
      // NEW: Try to find ordered photos array from Trulia-specific paths first
      const orderedPhotoPaths = [
        pageProps?.home?.media?.photos,
        pageProps?.listing?.media?.photos,
        pageProps?.property?.photos,
        pageProps?.initialState?.media?.photos,
        pageProps?.data?.photos,
      ];

      let foundOrderedPhotos = false;
      for (const photosArray of orderedPhotoPaths) {
        if (Array.isArray(photosArray) && photosArray.length > 0) {
          console.log('Found ordered Trulia photos array with', photosArray.length, 'items');
          foundOrderedPhotos = true;
          for (const photo of photosArray) {
            let url: string | null = null;
            if (typeof photo === 'string' && photo.includes('http')) {
              url = photo;
            } else if (typeof photo === 'object' && photo !== null) {
              const photoObj = photo as Record<string, unknown>;
              // Handle Trulia's mixedSources structure - get highest res JPEG
              const mixedSources = photoObj.mixedSources as Record<string, unknown[]> | undefined;
              const jpegSources = mixedSources?.jpeg as Array<{ url?: string }> | undefined;
              url = (photoObj.url || photoObj.src || photoObj.highResLink || 
                    photoObj.fullUrl || jpegSources?.[jpegSources.length - 1]?.url) as string;
            }
            if (url && url.trim() !== '' && url.includes('http') && !images.includes(url)) {
              images.push(url);
            }
          }
          break; // Use first ordered array found
        }
      }
      
      // Check specific paths where Trulia/Zillow store photos (if ordered not found)
      if (!foundOrderedPhotos) {
        const componentProps = pageProps?.componentProps;
        if (componentProps?.gdpClientCache) {
          console.log('Found componentProps.gdpClientCache, parsing stringified cache...');
          try {
            const cacheData = JSON.parse(componentProps.gdpClientCache);
            const cacheKeys = Object.keys(cacheData);
            console.log('Parsed gdpClientCache with', cacheKeys.length, 'entries');
            
            // Extract the primary listing identifier from the source URL
            const urlPath = sourceUrl ? new URL(sourceUrl).pathname.toLowerCase() : '';
            const zpidMatch = urlPath.match(/(\d{7,12})/);
            const primaryZpid = zpidMatch ? zpidMatch[1] : null;
            console.log('Looking for primary listing, zpid:', primaryZpid, 'urlPath:', urlPath.slice(-50));
            
            // Find the primary property cache entry
            let primaryCacheKey: string | null = null;
            for (const cacheKey of cacheKeys) {
              if (primaryZpid && cacheKey.includes(primaryZpid)) {
                primaryCacheKey = cacheKey;
                console.log('Found primary cache entry by zpid:', cacheKey.slice(0, 80));
                break;
              }
            }
            
            if (!primaryCacheKey && cacheKeys.length > 0) {
              primaryCacheKey = cacheKeys[0];
              console.log('Using first cache entry as primary:', primaryCacheKey.slice(0, 80));
            }
            
            if (primaryCacheKey) {
              const cacheEntry = cacheData[primaryCacheKey] as Record<string, unknown>;
              console.log('Processing PRIMARY cache entry only');
              
              if (cacheEntry.property) {
                const property = cacheEntry.property as Record<string, unknown>;
                console.log('Found property object, looking for photos...');
                
                const photoArrays = ['photos', 'hiResPhotos', 'responsivePhotos', 
                                     'desktopWebHighResPhotos', 'originalPhotos',
                                     'galleryPhotos', 'media'];
                for (const photoKey of photoArrays) {
                  if (property[photoKey]) {
                    console.log(`Found ${photoKey} array`);
                    findImageUrls(property[photoKey], 0);
                  }
                }
                
                findImageUrls(property, 0);
              }
            } else {
              console.log('No primary cache entry found, skipping gdpClientCache');
            }
          } catch (e) {
            console.log('Failed to parse gdpClientCache:', e);
          }
        }
        
        // Also check Trulia-specific paths
        const mediaPhotos = pageProps?.initialState?.media?.photos;
        if (mediaPhotos) {
          console.log('Found Trulia initialState.media.photos');
          findImageUrls(mediaPhotos, 0);
        }
        
        // Also check pageData paths
        const pageData = pageProps?.pageData || pageProps?.data;
        if (pageData) {
          console.log('Found pageData, searching for images...');
          findImageUrls(pageData, 0);
        }
        
        // General search as fallback
        findImageUrls(nextData, 0);
      }
      
      // Prepend hero image if found and not already first
      if (fallbackHeroUrl) {
        const existingIndex = images.indexOf(fallbackHeroUrl);
        if (existingIndex === -1) {
          images.unshift(fallbackHeroUrl);
          console.log('Prepended Trulia hero image to array');
        } else if (existingIndex > 0) {
          images.splice(existingIndex, 1);
          images.unshift(fallbackHeroUrl);
          console.log('Moved hero image to front of array');
        }
      }
      
      console.log('Found', images.length, 'images in __NEXT_DATA__');
    } catch (e) {
      console.log('Failed to parse __NEXT_DATA__:', e);
    }
  }
  
  // Pattern 2: Schema.org JSON-LD (common for property listings)
  const schemaPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let schemaMatch;
  while ((schemaMatch = schemaPattern.exec(html)) !== null) {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      if (schema.image) {
        const schemaImages = Array.isArray(schema.image) ? schema.image : [schema.image];
        schemaImages.forEach((img: unknown) => {
          if (typeof img === 'string') images.push(img);
          else if (typeof img === 'object' && img !== null) {
            const imgObj = img as Record<string, unknown>;
            if (imgObj.url) images.push(imgObj.url as string);
            if (imgObj.contentUrl) images.push(imgObj.contentUrl as string);
          }
        });
      }
      if (schema.photo) {
        const photos = Array.isArray(schema.photo) ? schema.photo : [schema.photo];
        photos.forEach((p: unknown) => {
          if (typeof p === 'string') images.push(p);
          else if (typeof p === 'object' && p !== null) {
            const pObj = p as Record<string, unknown>;
            if (pObj.url || pObj.contentUrl) images.push((pObj.url || pObj.contentUrl) as string);
          }
        });
      }
    } catch {
      // Not valid JSON, skip
    }
  }
  
  // Pattern 3: Zillow-specific window.__INITIAL_STATE__ or window.gdpClientCache
  const windowDataPatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?\s*(?:<\/script>|window\.|$)/,
    /window\.gdpClientCache\s*=\s*(\{[\s\S]+?\});?\s*(?:<\/script>|window\.|$)/,
    /window\.__DATA__\s*=\s*(\{[\s\S]+?\});?\s*(?:<\/script>|window\.|$)/,
  ];
  
  for (const pattern of windowDataPatterns) {
    const windowMatch = html.match(pattern);
    if (windowMatch) {
      try {
        const windowData = JSON.parse(windowMatch[1]);
        console.log('Found window data, parsing for images...');
        findImageUrls(windowData, 0);
      } catch {
        console.log('Failed to parse window data');
      }
    }
  }
  
  // Pattern 4: Search ALL script tags for photo arrays (catches updated Trulia structures)
  const allScriptsPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = allScriptsPattern.exec(html)) !== null) {
    const scriptContent = scriptMatch[1];
    
    // Look for patterns like "photos":["url1","url2"] or "images":["..."]
    const photoArrayPatterns = [
      /"(?:photos|images|gallery|photoUrls|imageUrls)":\s*\[([^\]]+)\]/gi,
      /"(?:hiResPhotos|responsivePhotos|galleryPhotos|propertyPhotos)":\s*\[([^\]]+)\]/gi,
    ];
    
    for (const pattern of photoArrayPatterns) {
      let arrayMatch;
      while ((arrayMatch = pattern.exec(scriptContent)) !== null) {
        // Extract URLs from the array content
        const urlMatches = arrayMatch[1].match(/https?:[^"']+\.(?:webp|jpg|jpeg|png)/g);
        if (urlMatches) {
          urlMatches.forEach(url => {
            const cleanUrl = url.replace(/\\/g, '');
            if (!cleanUrl.includes('icon') && !cleanUrl.includes('logo')) {
              images.push(cleanUrl);
            }
          });
        }
      }
    }
    
    // Also look for individual "url":"..." patterns within media/photo objects
    const urlPatterns = [
      /"(?:url|src|href|contentUrl)":\s*"(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png)[^"]*)"/gi,
      /"(?:mixedSources|desktopWebHighResPhoto)":\s*\{[^}]*"url":\s*"(https?:\/\/[^"]+)"/gi,
    ];
    
    for (const pattern of urlPatterns) {
      let urlMatch;
      while ((urlMatch = pattern.exec(scriptContent)) !== null) {
        const url = urlMatch[1].replace(/\\/g, '');
        if ((url.includes('zillowstatic') || url.includes('trulia') || url.includes('photos.')) &&
            url.match(/\.(jpg|jpeg|png|webp)/i) &&
            !url.includes('icon') && !url.includes('logo')) {
          images.push(url);
        }
      }
    }
  }
  
  // Pattern 5: Direct CDN URL extraction from anywhere in HTML
  const cdnPatterns = [
    /https?:\/\/photos\.zillowstatic\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi,
    /https?:\/\/[^\s"'<>]*trulia-cdn[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi,
    /https?:\/\/[^\s"'<>]*trulia\.com\/pictures[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi,
    /https?:\/\/[^\s"'<>]*streeteasy[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi,
  ];
  
  for (const pattern of cdnPatterns) {
    let cdnMatch;
    while ((cdnMatch = pattern.exec(html)) !== null) {
      const url = cdnMatch[0];
      if (!url.includes('icon') && !url.includes('logo') && !url.includes('avatar')) {
        images.push(url);
      }
    }
  }
  
  console.log('Total images found before deduplication:', images.length);
  
  // Filter out icons/logos first
  const filtered = images.filter(url => {
    const lower = url.toLowerCase();
    return !lower.includes('icon') && 
           !lower.includes('logo') && 
           !lower.includes('avatar') &&
           !lower.includes('sprite') &&
           !lower.includes('placeholder') &&
           !lower.includes('default-property-media');
  });
  
  // Deduplicate by image hash, keeping highest quality version
  const uniqueImages = deduplicateImagesByHash(filtered);
  
  console.log('Total unique images from embedded JSON:', uniqueImages.length, '(from', filtered.length, 'after filtering)');
  return uniqueImages;
}

// Extract image URLs from markdown and HTML content (catches images AI missed)
function extractImagesFromContent(markdown: string, html: string = ''): string[] {
  const images = new Set<string>();
  const content = markdown + ' ' + html; // Search both markdown and HTML
  
  // Pattern 1: Trulia/Zillow full-size images - prioritize these!
  // They follow patterns like: .../fp/{hash}-full.webp or uncropped versions
  const truliaFullPattern = /https?:\/\/[^\s"'<>\)]+(?:zillowstatic|trulia)[^\s"'<>\)]+(?:-full|-uncropped|_f\.)[^\s"'<>\)]*\.(?:webp|jpg|jpeg|png)/gi;
  let match;
  while ((match = truliaFullPattern.exec(content)) !== null) {
    images.add(match[0]);
  }
  
  // Pattern 2: Zillow/Trulia thumbs that can be converted to full-size
  // Match URLs like: photos.zillowstatic.com/fp/{hash}-cc_ft_960.webp
  const truliaThumbPattern = /https?:\/\/photos\.zillowstatic\.com\/fp\/[a-zA-Z0-9]+-[a-z_]+\d*\.(?:webp|jpg|jpeg|png)/gi;
  while ((match = truliaThumbPattern.exec(content)) !== null) {
    // Convert to larger version by replacing size suffix
    let url = match[0];
    // Try to get the uncropped/full version
    url = url.replace(/-cc_ft_\d+\./, '-uncropped_scaled_within_1536_1152.');
    url = url.replace(/-p_e\./, '-uncropped_scaled_within_1536_1152.');
    images.add(url);
  }
  
  // Pattern 3: Generic property image URLs with common CDN patterns
  const genericPropertyPattern = /https?:\/\/[^\s"'<>\)]+\/(?:photos?|images?|pictures?|media|uploads?|property)[^\s"'<>\)]+\.(?:jpg|jpeg|png|webp)/gi;
  while ((match = genericPropertyPattern.exec(content)) !== null) {
    images.add(match[0]);
  }
  
  // Pattern 4: Markdown image syntax ![alt](url)
  const markdownPattern = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
  while ((match = markdownPattern.exec(content)) !== null) {
    if (match[1].match(/\.(jpg|jpeg|png|webp|gif)/i)) {
      images.add(match[1]);
    }
  }
  
  // Pattern 5: HTML img src attributes
  const htmlSrcPattern = /src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi;
  while ((match = htmlSrcPattern.exec(content)) !== null) {
    images.add(match[1]);
  }
  
  // Pattern 6: data-src or lazy-load attributes (common in galleries)
  const lazySrcPattern = /(?:data-src|data-lazy-src|data-original)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi;
  while ((match = lazySrcPattern.exec(content)) !== null) {
    images.add(match[1]);
  }
  
  // Pattern 7: Background image URLs in style attributes
  const bgImagePattern = /background(?:-image)?:\s*url\(['"]?(https?:\/\/[^'")\s]+\.(?:jpg|jpeg|png|webp))['"]?\)/gi;
  while ((match = bgImagePattern.exec(content)) !== null) {
    images.add(match[1]);
  }
  
  // Pattern 8: Trulia/Zillow srcset attributes (multiple resolutions)
  const srcsetPattern = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(content)) !== null) {
    // Extract URLs from srcset (format: "url1 1x, url2 2x" or "url1 100w, url2 200w")
    const srcsetUrls = match[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    srcsetUrls.forEach(url => {
      if (url.match(/\.(jpg|jpeg|png|webp)/i) && 
          !url.includes('icon') && 
          !url.includes('logo') &&
          !url.includes('avatar')) {
        images.add(url);
      }
    });
  }
  
  // Pattern 9: Direct zillowstatic/trulia CDN URLs anywhere in content
  const cdnPattern = /https?:\/\/[^\s"'<>)]+(?:zillowstatic|trulia-cdn|trulia\.com\/pictures)[^\s"'<>)]+\.(?:jpg|jpeg|png|webp)/gi;
  while ((match = cdnPattern.exec(content)) !== null) {
    const url = match[0];
    if (!url.includes('icon') && !url.includes('logo')) {
      images.add(url);
    }
  }
  
  // Filter out thumbnails, icons, logos, and non-property images
  const filtered = Array.from(images).filter(url => {
    const lower = url.toLowerCase();
    // Exclude common non-property images
    if (lower.includes('icon') || 
        lower.includes('logo') || 
        lower.includes('avatar') ||
        lower.includes('sprite') ||
        lower.includes('button') ||
        lower.includes('arrow') ||
        lower.includes('placeholder') ||
        lower.includes('default-property') ||
        lower.includes('default-property-media') ||
        lower.includes('map-marker') ||
        lower.includes('static-map') ||
        lower.includes('googleusercontent') || // Google profile pics
        lower.includes('gravatar')) {
      return false;
    }
    // Exclude tiny thumbnails (often have size in URL)
    if (lower.includes('_xs') || lower.includes('_thumb') || lower.includes('50x50') || lower.includes('100x100')) {
      return false;
    }
    return true;
  });
  
  // Try to upgrade thumbnails to full-size versions
  const upgraded = filtered.map(url => {
    // Zillow/Trulia specific upgrades
    if (url.includes('zillowstatic') || url.includes('trulia')) {
      return url
        .replace(/-cc_ft_\d+\./, '-uncropped_scaled_within_1536_1152.')
        .replace(/-p_e\./, '-uncropped_scaled_within_1536_1152.')
        .replace(/-p_d\./, '-uncropped_scaled_within_1536_1152.')
        .replace(/-p_h\./, '-uncropped_scaled_within_1536_1152.');
    }
    return url;
  });
  
  // Deduplicate by image hash, keeping highest quality version
  return deduplicateImagesByHash(upgraded);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping property listing URL:', formattedUrl);

    // Call Firecrawl API with extract for structured data
    // Retry logic for timeout errors (real estate sites can be slow)
    let firecrawlData = null;
    let lastError = null;
    const maxAttempts = 2;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Firecrawl attempt ${attempt}/${maxAttempts}`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ['markdown', 'rawHtml', 'extract'], // Use rawHtml to preserve __NEXT_DATA__ scripts
          extract: {
            schema: propertySchema,
          },
          onlyMainContent: false, // Get FULL page to capture photo gallery
          waitFor: 15000, // Wait 15 seconds for gallery/carousel/JS to fully load
          timeout: 60000, // 60 second timeout for Firecrawl
        }),
      });

      const responseText = await response.text();
      console.log('Firecrawl raw response status:', response.status);
      console.log('Firecrawl raw response (first 1000 chars):', responseText.slice(0, 1000));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Firecrawl response:', parseError);
        lastError = 'Failed to parse scraping response';
        continue;
      }

      // Check for timeout errors and retry
      if (!response.ok || data.code === 'SCRAPE_TIMEOUT') {
        console.log('Firecrawl error/timeout:', data.error || data.code);
        lastError = data.error || data.message || `Scraping failed with status ${response.status}`;
        
        if ((data.code === 'SCRAPE_TIMEOUT' || response.status === 408) && attempt < maxAttempts) {
          console.log('Retrying in 3 seconds...');
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        
        // Final attempt failed or non-timeout error
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: lastError,
            code: data.code
          }),
          { status: response.status === 408 ? 408 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Success - break out of retry loop
      firecrawlData = data;
      break;
    }
    
    // If all attempts failed
    if (!firecrawlData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: lastError || 'Scraping failed after multiple attempts. Try a different listing URL or enter details manually.'
        }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = firecrawlData;

    // Extract data from response - Firecrawl v1 puts extract results in data.extract or data.data.extract
    const extractedJson = data.data?.extract || data.extract || data.data?.json || data.json || {};
    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.rawHtml || data.rawHtml || data.data?.html || data.html || ''; // Prefer rawHtml to preserve __NEXT_DATA__ scripts
    const metadata = data.data?.metadata || data.metadata || {};
    
    console.log('Extracted JSON keys:', Object.keys(extractedJson));
    console.log('Has address:', !!extractedJson.address);
    console.log('Has rent:', !!extractedJson.rent);
    console.log('HTML content length:', html.length);

    // FIRST: Try to extract photos directly from the primary listing's structured data
    // This is the most accurate method and avoids related property images
    const primaryListing = extractPrimaryListingPhotos(html, url);
    
    let allImages: string[];
    
    if (primaryListing && primaryListing.photos.length >= 3) {
      // Use the primary listing's photos directly - this is the most accurate source
      console.log(`Using ${primaryListing.photos.length} photos from primary listing (expected: ${primaryListing.count})`);
      allImages = deduplicateImagesByHash(primaryListing.photos);
    } else {
      // FALLBACK: Use all extraction methods if primary listing approach didn't work
      console.log('Primary listing photos not found or insufficient, using fallback extraction');
      
      // Extract images from embedded JSON (searches all scripts)
      const jsonEmbeddedImages = extractImagesFromEmbeddedJson(html, url);
      
      // Extract images from markdown/HTML content as fallback
      const contentImages = extractImagesFromContent(markdown, html);
      const aiImages = extractedJson.images || [];
      
      // Merge all sources with hash-based deduplication
      allImages = deduplicateImagesByHash([...jsonEmbeddedImages, ...aiImages, ...contentImages]);
      
      // Check if page metadata has a photo count we can use as a cap
      const photoCountMatch = html.match(/"photoCount":\s*(\d+)/);
      const expectedPhotoCount = photoCountMatch ? parseInt(photoCountMatch[1]) : null;
      
      console.log('Fallback image extraction:', {
        jsonEmbeddedCount: jsonEmbeddedImages.length,
        aiCount: aiImages.length,
        contentCount: contentImages.length,
        totalUnique: allImages.length,
        expectedPhotoCount: expectedPhotoCount
      });
      
      // If we have a reliable photo count from metadata and we're over, limit
      if (expectedPhotoCount && expectedPhotoCount >= 5 && allImages.length > expectedPhotoCount * 1.2) {
        console.log(`Limiting images from ${allImages.length} to expected count: ${expectedPhotoCount}`);
        allImages = allImages.slice(0, expectedPhotoCount);
      }
    }

    // Normalize and map the extracted data
    const normalizedData = {
      address: {
        street: extractedJson.address?.street || '',
        city: extractedJson.address?.city || '',
        state: extractedJson.address?.state || '',
        zip: extractedJson.address?.zip || '',
      },
      rent: extractedJson.rent || null,
      bedrooms: extractedJson.bedrooms || null,
      bathrooms: extractedJson.bathrooms || null,
      squareFeet: extractedJson.squareFeet || null,
      description: extractedJson.description || '',
      propertyType: normalizePropertyType(extractedJson.propertyType),
      amenities: mapAmenities(extractedJson.amenities || []),
      rawAmenities: extractedJson.amenities || [],
      petPolicy: {
        allowed: extractedJson.petPolicy?.allowed || false,
        deposit: extractedJson.petPolicy?.deposit || null,
        monthlyFee: extractedJson.petPolicy?.monthlyFee || null,
        restrictions: extractedJson.petPolicy?.restrictions || '',
      },
      images: allImages, // Use merged images from AI + markdown parsing
      yearBuilt: extractedJson.yearBuilt || null,
      utilitiesIncluded: extractedJson.utilitiesIncluded || [],
      availableDate: extractedJson.availableDate || null,
      contactInfo: {
        name: extractedJson.contactInfo?.name || '',
        phone: extractedJson.contactInfo?.phone || '',
        email: extractedJson.contactInfo?.email || '',
      },
      sourceUrl: formattedUrl,
      scrapedAt: new Date().toISOString(),
      pageTitle: metadata.title || '',
      rawMarkdown: markdown,
    };

    console.log('Scrape successful, extracted:', {
      address: normalizedData.address,
      rent: normalizedData.rent,
      bedrooms: normalizedData.bedrooms,
      amenitiesCount: normalizedData.amenities.length,
      imagesCount: normalizedData.images.length,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: normalizedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping property listing:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Failed to scrape listing';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
