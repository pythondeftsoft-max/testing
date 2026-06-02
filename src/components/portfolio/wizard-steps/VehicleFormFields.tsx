import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WizardData } from '../AddAssetWizard';

interface VehicleFormFieldsProps {
  wizardData: WizardData;
  onDataChange: (updates: Partial<WizardData>) => void;
}

export const VehicleFormFields: React.FC<VehicleFormFieldsProps> = ({
  wizardData,
  onDataChange,
}) => {
  const handleFieldChange = (field: string, value: any) => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      onDataChange({
        metadata: {
          ...wizardData.metadata,
          [metadataField]: value
        }
      });
    }
  };

  const currentYear = new Date().getFullYear();
  const selectedSubcategory = wizardData.selectedSubcategory;

  // Determine which shared fields to hide based on subcategory
  const hideRegistrationNumber = selectedSubcategory === 'aircraft';
  const hideMileageHours = ['car', 'boat', 'aircraft', 'rv'].includes(selectedSubcategory || '');

  // Render type-specific fields for Equipment
  const renderEquipmentFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="equipment_type">
          Equipment Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardData.metadata.equipment_type || ''}
          onValueChange={(value) => handleFieldChange('metadata.equipment_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select equipment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="construction">Construction</SelectItem>
            <SelectItem value="farm">Farm</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hours_of_use">Hours of Use</Label>
        <Input
          id="hours_of_use"
          type="number"
          step="1"
          min="0"
          value={wizardData.metadata.hours_of_use || ''}
          onChange={(e) => handleFieldChange('metadata.hours_of_use', e.target.value)}
          placeholder="Operating hours"
        />
        <p className="text-xs text-muted-foreground">
          Total operating hours (for heavy machinery)
        </p>
      </div>
    </>
  );

  // Render type-specific fields for Car
  const renderCarFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="vehicle_type">
          Vehicle Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardData.metadata.vehicle_type || ''}
          onValueChange={(value) => handleFieldChange('metadata.vehicle_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedan">Sedan</SelectItem>
            <SelectItem value="suv">SUV</SelectItem>
            <SelectItem value="truck">Truck</SelectItem>
            <SelectItem value="electric">Electric</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mileage">
          Mileage <span className="text-destructive">*</span>
        </Label>
        <Input
          id="mileage"
          type="number"
          step="1"
          min="0"
          value={wizardData.metadata.mileage || ''}
          onChange={(e) => handleFieldChange('metadata.mileage', e.target.value)}
          placeholder="Total miles"
          required
        />
        <p className="text-xs text-muted-foreground">
          Total miles on the odometer
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_plate">License Plate / Registration</Label>
        <Input
          id="license_plate"
          type="text"
          value={wizardData.metadata.license_plate || ''}
          onChange={(e) => handleFieldChange('metadata.license_plate', e.target.value)}
          placeholder="ABC-1234"
        />
      </div>
    </>
  );

  // Render type-specific fields for Boat
  const renderBoatFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="boat_type">
          Boat Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardData.metadata.boat_type || ''}
          onValueChange={(value) => handleFieldChange('metadata.boat_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select boat type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sailboat">Sailboat</SelectItem>
            <SelectItem value="motorboat">Motorboat</SelectItem>
            <SelectItem value="yacht">Yacht</SelectItem>
            <SelectItem value="jet_ski">Jet Ski</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="length_ft">
          Length (ft) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="length_ft"
          type="number"
          step="0.1"
          min="0"
          value={wizardData.metadata.length_ft || ''}
          onChange={(e) => handleFieldChange('metadata.length_ft', e.target.value)}
          placeholder="Physical length in feet"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="engine_hours">Engine Hours</Label>
        <Input
          id="engine_hours"
          type="number"
          step="1"
          min="0"
          value={wizardData.metadata.engine_hours || ''}
          onChange={(e) => handleFieldChange('metadata.engine_hours', e.target.value)}
          placeholder="Total engine hours"
        />
      </div>
    </>
  );

  // Render type-specific fields for Aircraft
  const renderAircraftFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="aircraft_type">
          Aircraft Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardData.metadata.aircraft_type || ''}
          onValueChange={(value) => handleFieldChange('metadata.aircraft_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select aircraft type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single_engine">Single Engine</SelectItem>
            <SelectItem value="multi_engine">Multi Engine</SelectItem>
            <SelectItem value="helicopter">Helicopter</SelectItem>
            <SelectItem value="jet">Jet</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tail_number">
          Tail Number (N-Number) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="tail_number"
          type="text"
          value={wizardData.metadata.tail_number || ''}
          onChange={(e) => handleFieldChange('metadata.tail_number', e.target.value)}
          placeholder="N12345"
          required
        />
        <p className="text-xs text-muted-foreground">
          FAA registration identifier
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="engine_hours">Engine Hours</Label>
        <Input
          id="engine_hours"
          type="number"
          step="1"
          min="0"
          value={wizardData.metadata.engine_hours || ''}
          onChange={(e) => handleFieldChange('metadata.engine_hours', e.target.value)}
          placeholder="Total engine hours"
        />
      </div>
    </>
  );

  // Render type-specific fields for RV
  const renderRVFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="rv_type">
          RV Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardData.metadata.rv_type || ''}
          onValueChange={(value) => handleFieldChange('metadata.rv_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select RV type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="class_a">Class A</SelectItem>
            <SelectItem value="class_b">Class B</SelectItem>
            <SelectItem value="class_c">Class C</SelectItem>
            <SelectItem value="fifth_wheel">Fifth Wheel</SelectItem>
            <SelectItem value="travel_trailer">Travel Trailer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mileage">
          Mileage <span className="text-destructive">*</span>
        </Label>
        <Input
          id="mileage"
          type="number"
          step="1"
          min="0"
          value={wizardData.metadata.mileage || ''}
          onChange={(e) => handleFieldChange('metadata.mileage', e.target.value)}
          placeholder="Total miles"
          required
        />
        <p className="text-xs text-muted-foreground">
          Total miles driven
        </p>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* SHARED FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Year - Required */}
        <div className="space-y-2">
          <Label htmlFor="year">
            Year <span className="text-destructive">*</span>
          </Label>
          <Input
            id="year"
            type="number"
            min="1900"
            max={currentYear + 1}
            value={wizardData.metadata.year || ''}
            onChange={(e) => handleFieldChange('metadata.year', e.target.value)}
            placeholder="YYYY"
            required
          />
          <p className="text-xs text-muted-foreground">
            Manufacturing year of the vehicle
          </p>
        </div>

        {/* Make/Manufacturer - Required */}
        <div className="space-y-2">
          <Label htmlFor="make">
            Make/Manufacturer <span className="text-destructive">*</span>
          </Label>
          <Input
            id="make"
            type="text"
            value={wizardData.metadata.make || ''}
            onChange={(e) => handleFieldChange('metadata.make', e.target.value)}
            placeholder="Ford, Caterpillar, Cessna, Sea Ray"
            required
          />
          <p className="text-xs text-muted-foreground">
            Brand or manufacturer name
          </p>
        </div>

        {/* Model - Optional */}
        <div className="space-y-2">
          <Label htmlFor="model">
            Model
          </Label>
          <Input
            id="model"
            type="text"
            value={wizardData.metadata.model || ''}
            onChange={(e) => handleFieldChange('metadata.model', e.target.value)}
            placeholder="F-150, 320D, 172"
          />
          <p className="text-xs text-muted-foreground">
            Specific model designation
          </p>
        </div>

        {/* Usage Type - Optional */}
        <div className="space-y-2">
          <Label htmlFor="usage_type">
            Usage Type
          </Label>
          <Select
            value={wizardData.metadata.usage_type || ''}
            onValueChange={(value) => handleFieldChange('metadata.usage_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select usage type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="mixed">Mixed Use</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How you primarily use this vehicle
          </p>
        </div>

        {/* VIN/Serial Number - Optional */}
        <div className="space-y-2">
          <Label htmlFor="vin_serial">
            VIN/Serial Number
          </Label>
          <Input
            id="vin_serial"
            type="text"
            value={wizardData.metadata.vin_serial || ''}
            onChange={(e) => handleFieldChange('metadata.vin_serial', e.target.value)}
            placeholder="Vehicle ID or Serial Number"
          />
          <p className="text-xs text-muted-foreground">
            Unique identification number
          </p>
        </div>

        {/* Registration Number - Optional (hide for aircraft) */}
        {!hideRegistrationNumber && (
          <div className="space-y-2">
            <Label htmlFor="registration_number">
              Registration Number
            </Label>
            <Input
              id="registration_number"
              type="text"
              value={wizardData.metadata.registration_number || ''}
              onChange={(e) => handleFieldChange('metadata.registration_number', e.target.value)}
              placeholder="License plate, N-number, Registration"
            />
            <p className="text-xs text-muted-foreground">
              License plate, tail number, or registration ID
            </p>
          </div>
        )}

        {/* Condition - Optional */}
        <div className="space-y-2">
          <Label htmlFor="condition">
            Condition
          </Label>
          <Select
            value={wizardData.metadata.condition || ''}
            onValueChange={(value) => handleFieldChange('metadata.condition', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Overall condition of the vehicle
          </p>
        </div>

        {/* Mileage/Hours - Optional (hide for car, boat, aircraft, rv) */}
        {!hideMileageHours && (
          <div className="space-y-2">
            <Label htmlFor="mileage_hours">
              Mileage/Hours
            </Label>
            <Input
              id="mileage_hours"
              type="number"
              step="1"
              min="0"
              value={wizardData.metadata.mileage_hours || ''}
              onChange={(e) => handleFieldChange('metadata.mileage_hours', e.target.value)}
              placeholder="Odometer reading or engine hours"
            />
            <p className="text-xs text-muted-foreground">
              Current mileage or operating hours
            </p>
          </div>
        )}
      </div>

      {/* TYPE-SPECIFIC FIELDS */}
      {selectedSubcategory && (
        <>
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4">
              Type-Specific Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedSubcategory === 'equipment' && renderEquipmentFields()}
              {selectedSubcategory === 'car' && renderCarFields()}
              {selectedSubcategory === 'boat' && renderBoatFields()}
              {selectedSubcategory === 'aircraft' && renderAircraftFields()}
              {selectedSubcategory === 'rv' && renderRVFields()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
