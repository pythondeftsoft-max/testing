-- Update gift card images with enhanced vendor-specific designs including logos and branding
UPDATE rewards SET image_url = CASE 
  WHEN name LIKE '%Google Play%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="googleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285F4"/>
      <stop offset="25%" style="stop-color:#34A853"/>
      <stop offset="50%" style="stop-color:#FBBC05"/>
      <stop offset="75%" style="stop-color:#EA4335"/>
      <stop offset="100%" style="stop-color:#4285F4"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#googleGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  
  <!-- Google Play Triangle Logo -->
  <g transform="translate(50, 50)">
    <polygon points="0,0 60,30 0,60" fill="#34A853" filter="url(#shadow)"/>
    <polygon points="0,0 30,15 0,30" fill="#EA4335"/>
    <polygon points="0,30 30,45 0,60" fill="#FBBC05"/>
    <polygon points="30,15 60,30 30,45" fill="#4285F4"/>
  </g>
  
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">Google Play</text>
  <text x="200" y="120" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="18">Gift Card</text>
  
  <circle cx="320" cy="80" r="25" fill="rgba(255,255,255,0.2)"/>
  <text x="320" y="87" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="220" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">$' || cost || '</text>
  <text x="200" y="250" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Redeem on Google Play Store</text>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Starbucks%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="starbucksGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" style="stop-color:#00704A"/>
      <stop offset="100%" style="stop-color:#004D33"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#starbucksGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- Starbucks Siren Logo -->
  <circle cx="80" cy="80" r="35" fill="white" filter="url(#glow)"/>
  <circle cx="80" cy="80" r="30" fill="#00704A"/>
  <circle cx="80" cy="75" r="15" fill="white"/>
  <ellipse cx="75" cy="72" rx="3" ry="4" fill="#00704A"/>
  <ellipse cx="85" cy="72" rx="3" ry="4" fill="#00704A"/>
  <path d="M70 85 Q80 90 90 85" stroke="white" stroke-width="2" fill="none"/>
  <path d="M65 90 Q80 100 95 90" stroke="white" stroke-width="2" fill="none"/>
  
  <text x="200" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">STARBUCKS</text>
  <text x="200" y="100" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFT CARD</text>
  
  <rect x="280" y="50" width="80" height="40" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="320" y="75" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="42" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Fuel your day</text>
  
  <!-- Coffee beans decoration -->
  <ellipse cx="50" cy="200" rx="4" ry="8" fill="rgba(255,255,255,0.3)" transform="rotate(20 50 200)"/>
  <ellipse cx="350" cy="220" rx="4" ry="8" fill="rgba(255,255,255,0.3)" transform="rotate(-20 350 220)"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Apple%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="appleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F5F5F7"/>
      <stop offset="100%" style="stop-color:#E8E8ED"/>
    </linearGradient>
    <filter id="appleShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.1"/>
    </filter>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#appleGrad)"/>
  <rect x="1" y="1" width="398" height="298" rx="14" fill="none" stroke="#D1D1D6" stroke-width="1"/>
  
  <!-- Apple Logo -->
  <g transform="translate(60, 50)">
    <path d="M25 0 C15 0 10 8 10 15 C10 25 20 35 25 40 C30 35 40 25 40 15 C40 8 35 0 25 0 Z" fill="#000"/>
    <path d="M22 5 C20 2 25 0 28 2" stroke="#000" stroke-width="2" fill="none"/>
  </g>
  
  <text x="200" y="80" text-anchor="middle" fill="#1D1D1F" font-family="SF Pro Display, Arial, sans-serif" font-size="32" font-weight="600">Apple</text>
  <text x="200" y="110" text-anchor="middle" fill="#86868B" font-family="SF Pro Display, Arial, sans-serif" font-size="16">Gift Card</text>
  
  <rect x="280" y="50" width="70" height="30" rx="15" fill="#007AFF"/>
  <text x="315" y="70" text-anchor="middle" fill="white" font-family="SF Pro Display, Arial, sans-serif" font-size="14" font-weight="600">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="#1D1D1F" font-family="SF Pro Display, Arial, sans-serif" font-size="48" font-weight="300">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="#86868B" font-family="SF Pro Display, Arial, sans-serif" font-size="14">Redeem on the App Store</text>
  
  <!-- Minimalist design elements -->
  <circle cx="350" cy="200" r="2" fill="#86868B"/>
  <circle cx="50" cy="220" r="2" fill="#86868B"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Amazon%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="amazonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF9900"/>
      <stop offset="100%" style="stop-color:#FFB84D"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="#232F3E"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <!-- Amazon Logo -->
  <text x="80" y="80" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">amazon</text>
  <path d="M50 85 Q150 100 180 85" stroke="url(#amazonGrad)" stroke-width="4" fill="none"/>
  <polygon points="175,82 185,87 175,92" fill="url(#amazonGrad)"/>
  
  <text x="200" y="130" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18">GIFT CARD</text>
  
  <rect x="300" y="50" width="70" height="30" rx="5" fill="url(#amazonGrad)"/>
  <text x="335" y="70" text-anchor="middle" fill="#232F3E" font-family="Arial, sans-serif" font-size="14" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="#FF9900" font-family="Arial, sans-serif" font-size="14">Shop millions of items</text>
  
  <!-- Package icon -->
  <rect x="320" y="180" width="20" height="15" fill="url(#amazonGrad)" rx="2"/>
  <rect x="322" y="175" width="16" height="3" fill="url(#amazonGrad)"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Netflix%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="netflixGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#E50914"/>
      <stop offset="100%" style="stop-color:#B20710"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#netflixGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- Netflix N Logo -->
  <g transform="translate(60, 50)">
    <rect x="0" y="0" width="8" height="40" fill="white"/>
    <rect x="32" y="0" width="8" height="40" fill="white"/>
    <polygon points="8,0 32,40 40,40 40,35 16,0" fill="white"/>
  </g>
  
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Netflix Sans, Arial, sans-serif" font-size="36" font-weight="bold">NETFLIX</text>
  <text x="200" y="110" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFT CARD</text>
  
  <rect x="290" y="50" width="80" height="35" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="330" y="73" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Stream unlimited entertainment</text>
  
  <!-- Film strip decoration -->
  <rect x="20" y="250" width="360" height="20" fill="rgba(255,255,255,0.1)" rx="10"/>
  <rect x="30" y="255" width="10" height="10" fill="rgba(255,255,255,0.3)" rx="2"/>
  <rect x="50" y="255" width="10" height="10" fill="rgba(255,255,255,0.3)" rx="2"/>
  <rect x="340" y="255" width="10" height="10" fill="rgba(255,255,255,0.3)" rx="2"/>
  <rect x="360" y="255" width="10" height="10" fill="rgba(255,255,255,0.3)" rx="2"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Target%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="targetGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" style="stop-color:#FF6B6B"/>
      <stop offset="100%" style="stop-color:#CC0000"/>
    </radialGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#targetGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  
  <!-- Target Bullseye Logo -->
  <g transform="translate(60, 50)">
    <circle cx="20" cy="20" r="18" fill="white"/>
    <circle cx="20" cy="20" r="14" fill="#CC0000"/>
    <circle cx="20" cy="20" r="10" fill="white"/>
    <circle cx="20" cy="20" r="6" fill="#CC0000"/>
    <circle cx="20" cy="20" r="2" fill="white"/>
  </g>
  
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">TARGET</text>
  <text x="200" y="110" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFTCARD</text>
  
  <circle cx="330" cy="70" r="25" fill="rgba(255,255,255,0.2)"/>
  <text x="330" y="77" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Expect More. Pay Less.</text>
  
  <!-- Decorative circles -->
  <circle cx="350" cy="200" r="8" fill="rgba(255,255,255,0.2)"/>
  <circle cx="50" cy="220" r="6" fill="rgba(255,255,255,0.2)"/>
  <circle cx="350" cy="250" r="4" fill="rgba(255,255,255,0.2)"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Home Depot%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="homedepotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6600"/>
      <stop offset="100%" style="stop-color:#E55A00"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#homedepotGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- Home Depot Apron/Tools -->
  <g transform="translate(50, 45)">
    <rect x="10" y="0" width="30" height="35" fill="white" rx="3"/>
    <rect x="5" y="10" width="40" height="20" fill="rgba(255,255,255,0.8)" rx="2"/>
    <rect x="20" y="40" width="3" height="15" fill="#8B4513"/>
    <rect x="0" y="50" width="25" height="3" fill="#8B4513"/>
  </g>
  
  <text x="200" y="75" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">THE HOME DEPOT</text>
  <text x="200" y="105" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFT CARD</text>
  
  <rect x="290" y="50" width="80" height="30" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="330" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">How doers get more done</text>
  
  <!-- Tool decorations -->
  <rect x="320" y="180" width="20" height="3" fill="rgba(255,255,255,0.3)" rx="1"/>
  <circle cx="340" cy="181" r="3" fill="rgba(255,255,255,0.3)"/>
  <rect x="40" y="200" width="3" height="20" fill="rgba(255,255,255,0.3)" rx="1"/>
  <circle cx="41" cy="195" r="3" fill="rgba(255,255,255,0.3)"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Visa%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="visaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1A1F71"/>
      <stop offset="100%" style="stop-color:#2E3A8C"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#visaGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <!-- Visa Logo -->
  <text x="80" y="80" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold" font-style="italic">VISA</text>
  
  <!-- Card chip simulation -->
  <rect x="50" y="120" width="25" height="20" fill="#FFD700" rx="3"/>
  <rect x="52" y="122" width="21" height="16" fill="#FFA500" rx="2"/>
  
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18">PREPAID GIFT CARD</text>
  
  <rect x="300" y="50" width="70" height="30" rx="5" fill="rgba(255,255,255,0.1)"/>
  <text x="335" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="180" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="210" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Accepted everywhere Visa is accepted</text>
  
  <!-- Card number pattern -->
  <text x="80" y="160" fill="rgba(255,255,255,0.6)" font-family="Courier, monospace" font-size="16">•••• •••• •••• ••••</text>
  
  <!-- Security features -->
  <circle cx="350" cy="180" r="15" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <text x="350" y="186" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="10">SECURE</text>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%Uber Eats%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="uberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06C167"/>
      <stop offset="100%" style="stop-color:#05A555"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#uberGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- Uber Eats Fork and Spoon -->
  <g transform="translate(60, 50)">
    <rect x="0" y="0" width="3" height="40" fill="white" rx="1"/>
    <circle cx="1.5" cy="5" r="2" fill="white"/>
    <circle cx="1.5" cy="12" r="2" fill="white"/>
    <circle cx="1.5" cy="19" r="2" fill="white"/>
    
    <ellipse cx="15" cy="10" rx="8" ry="3" fill="white"/>
    <rect x="13" y="15" width="4" height="25" fill="white" rx="2"/>
  </g>
  
  <text x="200" y="75" text-anchor="middle" fill="white" font-family="UberMove, Arial, sans-serif" font-size="32" font-weight="bold">Uber</text>
  <text x="280" y="75" fill="white" font-family="UberMove, Arial, sans-serif" font-size="32" font-weight="300">Eats</text>
  <text x="200" y="105" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFT CARD</text>
  
  <rect x="290" y="50" width="80" height="30" rx="15" fill="rgba(255,255,255,0.2)"/>
  <text x="330" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Get the food you love, delivered</text>
  
  <!-- Delivery bag icon -->
  <rect x="320" y="180" width="25" height="20" fill="rgba(255,255,255,0.3)" rx="3"/>
  <rect x="330" y="175" width="5" height="5" fill="rgba(255,255,255,0.5)" rx="1"/>
  
  <!-- Motion lines -->
  <path d="M50 220 L90 220" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-linecap="round"/>
  <path d="M60 230 L85 230" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
</svg>', 'UTF8'), 'base64')

  WHEN name LIKE '%DoorDash%' THEN 'data:image/svg+xml;base64,' || encode(convert_to('
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="doordashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF3008"/>
      <stop offset="100%" style="stop-color:#E02B00"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="15" fill="url(#doordashGrad)"/>
  <rect x="10" y="10" width="380" height="280" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- DoorDash Delivery Box -->
  <g transform="translate(50, 45)">
    <rect x="0" y="10" width="35" height="25" fill="white" rx="3"/>
    <rect x="5" y="5" width="25" height="5" fill="rgba(255,255,255,0.8)" rx="2"/>
    <circle cx="40" cy="30" r="4" fill="white"/>
    <circle cx="50" cy="25" r="3" fill="rgba(255,255,255,0.7)"/>
    <path d="M40 22 L55 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </g>
  
  <text x="200" y="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">DoorDash</text>
  <text x="200" y="110" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="16">GIFT CARD</text>
  
  <rect x="290" y="50" width="80" height="30" rx="15" fill="rgba(255,255,255,0.2)"/>
  <text x="330" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">$' || cost || '</text>
  
  <text x="200" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">$' || cost || '</text>
  <text x="200" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Restaurant delivery and more</text>
  
  <!-- Delivery tracking dots -->
  <circle cx="80" cy="250" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="120" cy="245" r="4" fill="rgba(255,255,255,0.6)"/>
  <circle cx="160" cy="250" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="240" cy="250" r="3" fill="rgba(255,255,255,0.4)"/>
  <circle cx="280" cy="245" r="4" fill="rgba(255,255,255,0.6)"/>
  <circle cx="320" cy="250" r="3" fill="rgba(255,255,255,0.4)"/>
</svg>', 'UTF8'), 'base64')

  ELSE image_url -- Keep existing image_url for any other vendors
END
WHERE name LIKE '%Gift Card%' OR name LIKE '%gift card%';