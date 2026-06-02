import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure2EntityRelationship() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 2 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-8 border-b-2 border-black pb-2">
        FIG. 2 – Entity-Relationship Diagram
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-4 gap-6">
        {/* Top Level - Users */}
        <div className="border-2 border-black p-4 text-center w-48 bg-white">
          <div className="text-xs text-black mb-1">201</div>
          <div className="font-semibold">PROFILES</div>
          <div className="text-xs mt-2 text-left border-t border-black pt-2">
            - id (PK)<br/>
            - user_id (FK)<br/>
            - role<br/>
            - email
          </div>
        </div>
        
        {/* Relationship Lines */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="text-xs">1</div>
            <div className="h-4 border-l-2 border-black" />
            <div className="text-xs">▼ N</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs">1</div>
            <div className="h-4 border-l-2 border-black" />
            <div className="text-xs">▼ N</div>
          </div>
        </div>
        
        {/* Second Level - Properties & Portfolios */}
        <div className="flex gap-8 flex-wrap justify-center">
          <div className="border-2 border-black p-4 text-center w-44 bg-white">
            <div className="text-xs text-black mb-1">202</div>
            <div className="font-semibold">PORTFOLIOS</div>
            <div className="text-xs mt-2 text-left border-t border-black pt-2">
              - id (PK)<br/>
              - owner_id (FK)<br/>
              - name
            </div>
          </div>
          <div className="border-2 border-black p-4 text-center w-44 bg-white">
            <div className="text-xs text-black mb-1">203</div>
            <div className="font-semibold">PROPERTIES</div>
            <div className="text-xs mt-2 text-left border-t border-black pt-2">
              - id (PK)<br/>
              - portfolio_id (FK)<br/>
              - address<br/>
              - rent_amount
            </div>
          </div>
        </div>
        
        {/* More Relationship Lines */}
        <div className="flex items-center gap-16">
          <div className="flex flex-col items-center">
            <div className="text-xs">1</div>
            <div className="h-4 border-l-2 border-black" />
            <div className="text-xs">▼ N</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs">1</div>
            <div className="h-4 border-l-2 border-black" />
            <div className="text-xs">▼ N</div>
          </div>
        </div>
        
        {/* Third Level - Tenants, Payments, Units */}
        <div className="flex gap-4 flex-wrap justify-center">
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">204</div>
            <div className="font-semibold text-xs">PROPERTY_UNITS</div>
            <div className="text-xs mt-1 text-left border-t border-black pt-1">
              - id (PK)<br/>
              - property_id (FK)
            </div>
          </div>
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">205</div>
            <div className="font-semibold text-xs">TENANT_LINKS</div>
            <div className="text-xs mt-1 text-left border-t border-black pt-1">
              - id (PK)<br/>
              - tenant_id (FK)<br/>
              - property_id (FK)
            </div>
          </div>
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">206</div>
            <div className="font-semibold text-xs">RENT_PAYMENTS</div>
            <div className="text-xs mt-1 text-left border-t border-black pt-1">
              - id (PK)<br/>
              - property_id (FK)<br/>
              - amount<br/>
              - status
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-8 border border-black p-3 text-xs">
          <div className="font-bold mb-2">LEGEND:</div>
          <div>PK = Primary Key | FK = Foreign Key</div>
          <div>1:N = One-to-Many Relationship</div>
        </div>
      </div>
    </div>
  );
}
