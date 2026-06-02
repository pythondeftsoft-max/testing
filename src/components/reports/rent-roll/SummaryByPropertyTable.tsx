import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PropertySummary } from '@/hooks/useRentRollData';

interface SummaryByPropertyTableProps {
  data: PropertySummary[];
}

export const SummaryByPropertyTable: React.FC<SummaryByPropertyTableProps> = ({ data }) => {
  // Sort by property address
  const sortedData = [...data].sort((a, b) => 
    a.property_address.localeCompare(b.property_address)
  );

  const totals = data.reduce((acc, item) => ({
    total_units: acc.total_units + item.total_units,
    occupied_units: acc.occupied_units + item.occupied_units,
    vacant_units: acc.vacant_units + item.vacant_units,
    market_rent: acc.market_rent + item.market_rent,
    actual_rent: acc.actual_rent + item.actual_rent,
  }), { total_units: 0, occupied_units: 0, vacant_units: 0, market_rent: 0, actual_rent: 0 });

  const totalOccupancyRate = totals.total_units > 0 ? (totals.occupied_units / totals.total_units) * 100 : 0;
  const totalAvgRent = totals.total_units > 0 ? totals.market_rent / totals.total_units : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary by property</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Address</TableHead>
              <TableHead className="text-right">Total Units</TableHead>
              <TableHead className="text-right">Occupied</TableHead>
              <TableHead className="text-right">Vacant</TableHead>
              <TableHead className="text-right">Occupancy %</TableHead>
              <TableHead className="text-right">Market Rent</TableHead>
              <TableHead className="text-right">Actual Rent</TableHead>
              <TableHead className="text-right">Avg Rent/Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.property_address}>
                <TableCell className="font-medium max-w-xs">
                  <div className="truncate" title={item.property_address}>
                    {item.property_address}
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.total_units.toLocaleString()}</TableCell>
                <TableCell className="text-right">{item.occupied_units.toLocaleString()}</TableCell>
                <TableCell className="text-right">{item.vacant_units.toLocaleString()}</TableCell>
                <TableCell className="text-right">{item.occupancy_rate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">${item.market_rent.toLocaleString()}</TableCell>
                <TableCell className="text-right">${item.actual_rent.toLocaleString()}</TableCell>
                <TableCell className="text-right">${item.avg_rent_per_unit.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="border-t-2 font-medium">
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">{totals.total_units.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">{totals.occupied_units.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">{totals.vacant_units.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">{totalOccupancyRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right font-semibold">${totals.market_rent.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">${totals.actual_rent.toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">${totalAvgRent.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};