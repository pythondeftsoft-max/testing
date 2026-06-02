const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface HudRequest {
  mode: 'fmr' | 'eligibility' | 'demand';
  zip: string;
  bedrooms?: number;
  householdSize?: number;
  annualIncome?: number;
}

// Map ZIP to county FIPS: zippopotam (lat/lon) → FCC API (county FIPS)
async function getEntityId(zip: string): Promise<string | null> {
  try {
    console.log(`[geocode] Getting coordinates for ZIP ${zip}`);
    const zipRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!zipRes.ok) {
      console.error(`[geocode] Zippopotam error: ${zipRes.status}`);
      return null;
    }
    const zipData = await zipRes.json();
    const place = zipData?.places?.[0];
    if (!place) {
      console.error(`[geocode] No places found for ZIP ${zip}`);
      return null;
    }
    const lat = place.latitude;
    const lon = place.longitude;
    const placeName = place['place name'];
    const state = place['state abbreviation'];
    console.log(`[geocode] ZIP ${zip} → ${placeName}, ${state} (${lat}, ${lon})`);

    const fccUrl = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lon}&format=json`;
    console.log(`[geocode] FCC lookup: ${fccUrl}`);
    const fccRes = await fetch(fccUrl);
    if (!fccRes.ok) {
      const body = await fccRes.text();
      console.error(`[geocode] FCC error: ${fccRes.status} — ${body.slice(0, 200)}`);
      return null;
    }
    const fccData = await fccRes.json();
    const county = fccData?.results?.[0];
    if (!county) {
      console.error(`[geocode] No FCC results for coordinates`);
      return null;
    }

    const countyFips = county.county_fips;
    if (countyFips) {
      const entityId = `${countyFips}99999`;
      console.log(`[geocode] entityId=${entityId} (${county.county_name || 'unknown'})`);
      return entityId;
    }

    console.error(`[geocode] Missing FIPS in FCC response: ${JSON.stringify(county)}`);
    return null;
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}

// Fetch Fair Market Rents
async function fetchFMR(entityId: string, token: string) {
  const url = `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}`;
  console.log(`[FMR] Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FMR API error: ${res.status} — ${body.slice(0, 200)}`);
  }
  return await res.json();
}

// Fetch Income Limits
async function fetchIncomeLimits(entityId: string, token: string) {
  const url = `https://www.huduser.gov/hudapi/public/il/data/${entityId}`;
  console.log(`[IL] Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IL API error: ${res.status} — ${body.slice(0, 200)}`);
  }
  return await res.json();
}

const bedroomFieldMap: Record<number, string[]> = {
  0: ['Efficiency', 'efficiency', 'fmr_0', 'fmr0'],
  1: ['One-Bedroom', 'one_bedroom', 'fmr_1', 'fmr1'],
  2: ['Two-Bedroom', 'two_bedroom', 'fmr_2', 'fmr2'],
  3: ['Three-Bedroom', 'three_bedroom', 'fmr_3', 'fmr3'],
  4: ['Four-Bedroom', 'four_bedroom', 'fmr_4', 'fmr4'],
  5: ['Five-Bedroom', 'five_bedroom', 'fmr_5', 'fmr5'],
};

const bedroomLabels: Record<number, string> = {
  0: 'Studio',
  1: '1-Bedroom',
  2: '2-Bedroom',
  3: '3-Bedroom',
  4: '4-Bedroom',
  5: '5+ Bedroom',
};

function extractFmrValue(d: any, bedrooms: number): number | null {
  const keysToTry = bedroomFieldMap[bedrooms] || [`fmr_${bedrooms}`];

  // Try direct fields
  for (const key of keysToTry) {
    if (d[key] !== undefined && typeof d[key] === 'number') return d[key];
  }

  // Try nested basicdata (HUD API nests FMR values here)
  if (d.basicdata) {
    const bd = Array.isArray(d.basicdata) ? d.basicdata[0] : d.basicdata;
    for (const key of keysToTry) {
      if (bd?.[key] !== undefined && typeof bd[key] === 'number') return bd[key];
    }
  }

  // Try nested year_data
  if (d.year_data) {
    const yearData = Array.isArray(d.year_data) ? d.year_data[0] : d.year_data;
    for (const key of keysToTry) {
      if (yearData?.[key] !== undefined && typeof yearData[key] === 'number') return yearData[key];
    }
  }

  return null;
}

function extractAllFmr(d: any): Record<number, number> {
  const result: Record<number, number> = {};
  for (let br = 0; br <= 5; br++) {
    const val = extractFmrValue(d, br);
    if (val !== null) result[br] = val;
  }

  // If nothing found, try fallback numeric scan for 0-4
  if (Object.keys(result).length === 0) {
    console.log(`[extractAllFmr] Fallback scan. Keys: ${JSON.stringify(Object.keys(d))}`);
    const numericValues = Object.entries(d)
      .filter(([_, v]) => typeof v === 'number' && (v as number) > 100)
      .map(([k, v]) => ({ key: k, value: v as number }));
    console.log(`[extractAllFmr] Numeric fields: ${JSON.stringify(numericValues)}`);
    numericValues.slice(0, 5).forEach((nv, i) => { result[i] = nv.value; });
  }

  return result;
}

function processFMR(data: any, bedrooms: number) {
  const d = data?.data;
  if (!d) throw new Error('No FMR data returned');

  const allFmr = extractAllFmr(d);
  let fmr = allFmr[bedrooms] ?? null;

  // Fallback: basicrent
  if (!fmr && d.basicrent !== undefined && typeof d.basicrent === 'number') {
    fmr = d.basicrent;
  }

  if (!fmr) throw new Error('Could not extract FMR value from HUD data');

  // Build all-bedroom summary
  const fmrByBedroom: Record<string, { fmr: number; label: string; voucherLow: number; voucherHigh: number }> = {};
  for (const [br, val] of Object.entries(allFmr)) {
    const brNum = Number(br);
    fmrByBedroom[br] = {
      fmr: val,
      label: bedroomLabels[brNum] || `${br}-Bedroom`,
      voucherLow: Math.round(val * 0.9),
      voucherHigh: Math.round(val * 1.1),
    };
  }

  return {
    fmr,
    bedroomLabel: bedroomLabels[bedrooms] || `${bedrooms}-Bedroom`,
    voucherRange: { low: Math.round(fmr * 0.9), high: Math.round(fmr * 1.1) },
    fmrByBedroom,
    areaName: d.area_name || d.county_name || d.metro_name || 'Unknown Area',
    year: d.year || new Date().getFullYear(),
    rawData: d,
  };
}

function processEligibility(data: any, householdSize: number, annualIncome: number) {
  const d = data?.data;
  if (!d) throw new Error('No income limit data returned');

  console.log(`[processEligibility] Available keys: ${JSON.stringify(Object.keys(d))}`);

  let medianIncome = d.median_income || d.median || null;
  let veryLowLimit = d[`l50_p${householdSize}`] || d[`l50_${householdSize}`] || null;
  let lowLimit = d[`l80_p${householdSize}`] || d[`l80_${householdSize}`] || null;
  let extremelyLowLimit = d[`l30_p${householdSize}`] || d[`l30_${householdSize}`] || null;

  if (medianIncome && !veryLowLimit) veryLowLimit = Math.round(medianIncome * 0.5);
  if (medianIncome && !lowLimit) lowLimit = Math.round(medianIncome * 0.8);
  if (medianIncome && !extremelyLowLimit) extremelyLowLimit = Math.round(medianIncome * 0.3);

  const monthlyIncome = annualIncome / 12;
  const affordableRent = Math.round(monthlyIncome * 0.3);

  // Calculate AMI percentage and income tier
  const amiPercent = medianIncome ? Math.round((annualIncome / medianIncome) * 100) : null;

  let eligibilityCategory = 'above_limits';
  let incomeTier = 'Above Low Income';
  if (extremelyLowLimit && annualIncome <= extremelyLowLimit) {
    eligibilityCategory = 'extremely_low_income';
    incomeTier = 'Extremely Low Income';
  } else if (veryLowLimit && annualIncome <= veryLowLimit) {
    eligibilityCategory = 'very_low_income';
    incomeTier = 'Very Low Income';
  } else if (lowLimit && annualIncome <= lowLimit) {
    eligibilityCategory = 'low_income';
    incomeTier = 'Low Income';
  }

  return {
    medianIncome,
    veryLowIncomeLimit: veryLowLimit,
    lowIncomeLimit: lowLimit,
    extremelyLowIncomeLimit: extremelyLowLimit,
    amiPercent,
    incomeTier,
    annualIncome,
    householdSize,
    eligibilityCategory,
    affordableRent,
    monthlyIncome: Math.round(monthlyIncome),
    areaName: d.area_name || d.county_name || 'Unknown Area',
    year: d.year || new Date().getFullYear(),
  };
}

function processDemand(fmrData: any, ilData: any) {
  const fmr = fmrData?.data;
  const il = ilData?.data;
  const medianIncome = il?.median_income || il?.median || 50000;

  // Extract all bedroom FMRs
  const allFmr = extractAllFmr(fmr || {});
  const baseFmr = allFmr[2] || Object.values(allFmr)[0] || 1200;

  const annualRent = baseFmr * 12;
  const costBurdenRate = Math.round((annualRent / medianIncome) * 100);

  // Voucher Demand Score (0-100)
  // Factors: cost burden pressure, income-to-rent ratio, affordability gap
  const costBurdenScore = Math.min(costBurdenRate / 60 * 100, 100); // 60%+ = 100
  const affordableMonthlyRent = Math.round((medianIncome * 0.3) / 12);
  const rentGapRatio = baseFmr > 0 ? Math.max(0, (baseFmr - affordableMonthlyRent) / baseFmr) : 0;
  const rentGapScore = Math.min(rentGapRatio * 200, 100); // 50%+ gap = 100
  const incomeRatioScore = medianIncome < 40000 ? 80 : medianIncome < 60000 ? 60 : medianIncome < 80000 ? 40 : 20;

  const voucherDemandScore = Math.round(
    costBurdenScore * 0.4 + rentGapScore * 0.35 + incomeRatioScore * 0.25
  );

  // Affordable Housing Gap: difference between what people can afford vs FMR
  const affordableHousingGap = Math.max(0, baseFmr - affordableMonthlyRent);

  // Build FMR by bedroom with voucher ranges
  const fmrByBedroom: Record<string, { fmr: number; label: string; voucherLow: number; voucherHigh: number }> = {};
  for (const [br, val] of Object.entries(allFmr)) {
    const brNum = Number(br);
    fmrByBedroom[br] = {
      fmr: val,
      label: bedroomLabels[brNum] || `${br}-Bedroom`,
      voucherLow: Math.round(val * 0.9),
      voucherHigh: Math.round(val * 1.1),
    };
  }

  return {
    areaName: fmr?.area_name || il?.area_name || 'Unknown Area',
    medianIncome,
    baselineFmr: baseFmr,
    annualRentCost: annualRent,
    costBurdenPercent: costBurdenRate,
    severeCostBurden: costBurdenRate > 50,
    housingShortageIndicator: costBurdenRate > 35,
    voucherDemandScore: Math.min(voucherDemandScore, 100),
    affordableHousingGap,
    affordableMonthlyRent,
    fmrByBedroom,
    demandLevel: costBurdenRate > 45 ? 'very_high' : costBurdenRate > 35 ? 'high' : costBurdenRate > 25 ? 'moderate' : 'low',
    metroAreaName: fmr?.metro_name || fmr?.area_name || il?.area_name || 'Unknown Metro Area',
    insights: {
      regional: `This analysis reflects the HUD Metro Fair Market Rent Area for ${fmr?.metro_name || fmr?.area_name || 'this region'}. Housing vouchers are administered by local Public Housing Authorities and can typically be used anywhere within the metro area — demand represents regional housing assistance pressure, not a single ZIP code or property.`,
      costBurden: costBurdenRate > 30
        ? `Renters in this metro area spend approximately ${costBurdenRate}% of median income on rent — above the 30% affordability threshold, indicating significant regional housing cost pressure.`
        : `Renters spend about ${costBurdenRate}% of median income on rent — within the generally affordable range for this metro area.`,
      voucherDemand: voucherDemandScore >= 70
        ? `The Voucher Demand Score of ${voucherDemandScore}/100 indicates very strong regional demand for affordable and voucher-supported housing. Landlords accepting vouchers are likely to see high tenant interest across this metro area.`
        : voucherDemandScore >= 40
        ? `The Voucher Demand Score of ${voucherDemandScore}/100 suggests moderate regional demand for voucher-supported housing in this metro area.`
        : `The Voucher Demand Score of ${voucherDemandScore}/100 indicates relatively lower regional demand pressure for affordable housing programs.`,
      gap: affordableHousingGap > 200
        ? `There is a $${affordableHousingGap}/mo gap between what median-income renters can afford and the Fair Market Rent across this metro area, suggesting strong demand for subsidized or voucher-supported units.`
        : `The affordability gap of $${affordableHousingGap}/mo is relatively narrow, indicating that market rents are closer to what area residents can afford.`,
      opportunity: voucherDemandScore >= 50
        ? 'This metro area shows strong signals for Section 8 and voucher-accepting landlords. Properties priced within the voucher rent range should attract steady demand.'
        : 'This metro area has moderate demand for affordable housing programs. Consider voucher acceptance as part of a diversified tenant strategy.',
    },
    year: fmr?.year || new Date().getFullYear(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const token = Deno.env.get('HUD_API_TOKEN');
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'HUD API token not configured' }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const body: HudRequest = await req.json();
    const { mode, zip, bedrooms = 2, householdSize = 1, annualIncome = 30000 } = body;

    if (!zip || !mode) {
      return new Response(
        JSON.stringify({ success: false, error: 'zip and mode are required' }),
        { status: 200, headers: jsonHeaders }
      );
    }

    console.log(`[hud-intelligence] mode=${mode} zip=${zip}`);

    const entityId = await getEntityId(zip);
    if (!entityId) {
      return new Response(
        JSON.stringify({ success: false, error: `Could not find county data for ZIP code ${zip}. Please verify the ZIP code.` }),
        { status: 200, headers: jsonHeaders }
      );
    }

    console.log(`[hud-intelligence] entityId=${entityId}`);

    let result: any;

    if (mode === 'fmr') {
      const fmrData = await fetchFMR(entityId, token);
      result = processFMR(fmrData, bedrooms);
    } else if (mode === 'eligibility') {
      const ilData = await fetchIncomeLimits(entityId, token);
      result = processEligibility(ilData, householdSize, annualIncome);
    } else if (mode === 'demand') {
      const [fmrData, ilData] = await Promise.all([
        fetchFMR(entityId, token),
        fetchIncomeLimits(entityId, token),
      ]);
      result = processDemand(fmrData, ilData);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown mode: ${mode}` }),
        { status: 200, headers: jsonHeaders }
      );
    }

    console.log(`[hud-intelligence] Success for ${mode}/${zip}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error('[hud-intelligence] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      { status: 200, headers: jsonHeaders }
    );
  }
});