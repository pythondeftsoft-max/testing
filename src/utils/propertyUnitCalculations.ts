export interface PropertyUnit {
  bedrooms?: number | null;
  bathrooms?: number | null;
}

export interface AllocationResult {
  remainingBeds: number;
  remainingBaths: number;
  allocatedBeds: number;
  allocatedBaths: number;
  isOverallocated: boolean;
  isComplete: boolean;
}

export const calculateRemainingBedBath = (
  propertyBeds: number,
  propertyBaths: number,
  units: PropertyUnit[]
): AllocationResult => {
  const allocatedBeds = units.reduce((sum, u) => sum + (u.bedrooms || 0), 0);
  const allocatedBaths = units.reduce((sum, u) => sum + (u.bathrooms || 0), 0);
  
  return {
    remainingBeds: propertyBeds - allocatedBeds,
    remainingBaths: propertyBaths - allocatedBaths,
    allocatedBeds,
    allocatedBaths,
    isOverallocated: allocatedBeds > propertyBeds || allocatedBaths > propertyBaths,
    isComplete: allocatedBeds === propertyBeds && allocatedBaths === propertyBaths,
  };
};
