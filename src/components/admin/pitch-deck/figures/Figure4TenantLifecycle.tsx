import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure4TenantLifecycle() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 4 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 4 – Tenant Application Lifecycle State Machine
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-8 gap-4">
        {/* Initial State */}
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-black" />
          <span className="text-xs">START</span>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Application Submitted */}
        <div className="border-2 border-black p-4 text-center w-56 bg-white rounded-lg">
          <div className="text-xs text-black mb-1">401</div>
          <div className="font-semibold">APPLICATION_SUBMITTED</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Under Review */}
        <div className="border-2 border-black p-4 text-center w-56 bg-white rounded-lg">
          <div className="text-xs text-black mb-1">402</div>
          <div className="font-semibold">UNDER_REVIEW</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Screening */}
        <div className="border-2 border-black p-4 text-center w-56 bg-white rounded-lg">
          <div className="text-xs text-black mb-1">403</div>
          <div className="font-semibold">SCREENING</div>
          <div className="text-xs mt-1">(Background Check)</div>
        </div>
        
        {/* Branch */}
        <div className="flex items-center gap-8 mt-4">
          {/* Denied Path */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Fail</div>
            <div className="border-2 border-black p-3 text-center w-40 bg-white rounded-lg">
              <div className="text-xs text-black mb-1">404</div>
              <div className="font-semibold text-sm">DENIED</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="w-4 h-4 rounded-full border-2 border-black mt-2" />
            <span className="text-xs mt-1">END</span>
          </div>
          
          {/* Approved Path */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Pass</div>
            <div className="border-2 border-black p-3 text-center w-40 bg-white rounded-lg">
              <div className="text-xs text-black mb-1">405</div>
              <div className="font-semibold text-sm">APPROVED</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
          </div>
        </div>
        
        {/* Lease Signed & Active */}
        <div className="flex flex-col items-center mt-4 ml-28">
          <div className="border-2 border-black p-3 text-center w-40 bg-white rounded-lg">
            <div className="text-xs text-black mb-1">406</div>
            <div className="font-semibold text-sm">LEASE_SIGNED</div>
          </div>
          <div className="h-4 border-l-2 border-black" />
          <div className="text-xs">▼</div>
          <div className="border-2 border-black p-3 text-center w-40 bg-white rounded-lg">
            <div className="text-xs text-black mb-1">407</div>
            <div className="font-semibold text-sm">ACTIVE_TENANT</div>
          </div>
          <div className="h-4 border-l-2 border-black mt-2" />
          <div className="text-xs">▼</div>
          <div className="border-2 border-black p-3 text-center w-40 bg-white rounded-lg">
            <div className="text-xs text-black mb-1">408</div>
            <div className="font-semibold text-sm">MOVE_OUT</div>
          </div>
          <div className="h-4 border-l-2 border-black mt-2" />
          <div className="w-4 h-4 rounded-full border-2 border-black mt-2" />
          <span className="text-xs mt-1">END</span>
        </div>
      </div>
    </div>
  );
}
