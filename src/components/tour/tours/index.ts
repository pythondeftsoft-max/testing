// Landlord tour configuration exports
export {
  allTourSteps,
  getStepsForPage,
  portfolioSelectSteps,
  dashboardSteps,
  TOTAL_TOUR_STEPS,
  DASHBOARD_STEP_OFFSET,
  STEP_TAB_REQUIREMENTS,
  STEP_SUBTAB_REQUIREMENTS,
  STEP_TAGGING_TAB_REQUIREMENTS,
} from './landlordTour';

export type { TourStep } from './landlordTour';

export {
  listingTourSteps,
  LISTING_TOTAL_STEPS,
  LISTING_DASHBOARD_OFFSET,
  LISTING_STEP_TAB_REQUIREMENTS,
} from './landlordListingTour';

export type { ListingTourStep } from './landlordListingTour';

import { allTourSteps, TOTAL_TOUR_STEPS, DASHBOARD_STEP_OFFSET, STEP_TAB_REQUIREMENTS, STEP_SUBTAB_REQUIREMENTS, STEP_TAGGING_TAB_REQUIREMENTS } from './landlordTour';
import { listingTourSteps, LISTING_TOTAL_STEPS, LISTING_DASHBOARD_OFFSET, LISTING_STEP_TAB_REQUIREMENTS } from './landlordListingTour';

export type TourVariant = 'pm' | 'listing';

/**
 * Returns the right tour configuration based on the user's mode.
 * Listing mode = short 8-step welcome tour.
 * PM mode = full 29-step PM walkthrough.
 */
export function getTourConfig(variant: TourVariant) {
  if (variant === 'listing') {
    return {
      steps: listingTourSteps,
      totalSteps: LISTING_TOTAL_STEPS,
      dashboardOffset: LISTING_DASHBOARD_OFFSET,
      tabRequirements: LISTING_STEP_TAB_REQUIREMENTS,
      subtabRequirements: {} as Record<number, string>,
      taggingTabRequirements: {} as Record<number, 'untagged' | 'tagged' | 'rules'>,
    };
  }
  return {
    steps: allTourSteps,
    totalSteps: TOTAL_TOUR_STEPS,
    dashboardOffset: DASHBOARD_STEP_OFFSET,
    tabRequirements: STEP_TAB_REQUIREMENTS,
    subtabRequirements: STEP_SUBTAB_REQUIREMENTS,
    taggingTabRequirements: STEP_TAGGING_TAB_REQUIREMENTS,
  };
}
