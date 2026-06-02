import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure6AutoTagRules() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 6 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 6 – Auto-Tag Rules Processing Flow
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-6 gap-3">
        {/* Start */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-black" />
          <span className="text-xs">New Payment Received</span>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Load Rules */}
        <div className="border-2 border-black p-3 text-center w-56 bg-white">
          <div className="text-xs text-black mb-1">601</div>
          <div className="font-semibold text-sm">Load Active Rules</div>
          <div className="text-xs mt-1">(Ordered by Priority)</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Loop Start */}
        <div className="border border-black p-2 text-center w-56 bg-white">
          <div className="text-xs font-semibold">FOR EACH RULE</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Check Criteria */}
        <div className="border-2 border-black p-3 text-center w-56 bg-white">
          <div className="text-xs text-black mb-1">602</div>
          <div className="font-semibold text-sm">Evaluate Rule Criteria</div>
          <div className="text-xs mt-1">(Amount, Description, Sender)</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Decision */}
        <div className="border-2 border-black p-4 text-center w-40 bg-white" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
          <div className="text-xs text-black">603</div>
          <div className="font-semibold text-xs">Match?</div>
        </div>
        
        {/* Branch */}
        <div className="flex items-start gap-16 mt-2">
          {/* No - Continue */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">No</div>
            <div className="border border-black p-2 text-center w-32 bg-white">
              <div className="text-xs">Next Rule</div>
            </div>
            <div className="h-8 border-l-2 border-black" />
            <div className="text-xs">↑ Loop</div>
          </div>
          
          {/* Yes - Apply */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Yes</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white">
              <div className="text-xs text-black">604</div>
              <div className="font-semibold text-xs">Apply Tag</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white mt-2">
              <div className="text-xs text-black">605</div>
              <div className="font-semibold text-xs">Link to Property</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white mt-2">
              <div className="text-xs text-black">606</div>
              <div className="font-semibold text-xs">Log Action</div>
            </div>
          </div>
        </div>
        
        {/* End */}
        <div className="flex items-center gap-2 mt-4">
          <div className="w-4 h-4 rounded-full border-2 border-black" />
          <span className="text-xs">END</span>
        </div>
      </div>
    </div>
  );
}
