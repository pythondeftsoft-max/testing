import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure8PaymentCorrection() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 8 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 8 – Payment Correction State Machine
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-6 gap-3">
        {/* Start */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-black" />
          <span className="text-xs">Error Detected</span>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Pending Review */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white rounded-lg">
          <div className="text-xs text-black mb-1">801</div>
          <div className="font-semibold">PENDING_REVIEW</div>
          <div className="text-xs mt-1">(Admin notified)</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Under Investigation */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white rounded-lg">
          <div className="text-xs text-black mb-1">802</div>
          <div className="font-semibold">UNDER_INVESTIGATION</div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Decision */}
        <div className="border-2 border-black p-4 text-center w-44 bg-white" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
          <div className="text-xs text-black">803</div>
          <div className="font-semibold text-xs">Action<br/>Required?</div>
        </div>
        
        {/* Branch */}
        <div className="flex items-start gap-8 mt-2">
          {/* No Action */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">No Error</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg">
              <div className="text-xs text-black">804</div>
              <div className="font-semibold text-xs">DISMISSED</div>
            </div>
            <div className="h-6 border-l-2 border-black mt-2" />
            <div className="w-4 h-4 rounded-full border-2 border-black" />
            <span className="text-xs mt-1">END</span>
          </div>
          
          {/* Correction Path */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Needs Fix</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg">
              <div className="text-xs text-black">805</div>
              <div className="font-semibold text-xs">CORRECTION_PENDING</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg mt-2">
              <div className="text-xs text-black">806</div>
              <div className="font-semibold text-xs">APPLYING_CORRECTION</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg mt-2">
              <div className="text-xs text-black">807</div>
              <div className="font-semibold text-xs">VERIFICATION</div>
            </div>
          </div>
          
          {/* Refund Path */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Refund</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg">
              <div className="text-xs text-black">808</div>
              <div className="font-semibold text-xs">REFUND_INITIATED</div>
            </div>
            <div className="h-4 border-l-2 border-black mt-2" />
            <div className="text-xs">▼</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white rounded-lg mt-2">
              <div className="text-xs text-black">809</div>
              <div className="font-semibold text-xs">REFUND_COMPLETE</div>
            </div>
          </div>
        </div>
        
        {/* Final States Merge */}
        <div className="flex items-center gap-2 mt-6">
          <div className="border-2 border-black p-2 text-center w-44 bg-white rounded-lg">
            <div className="text-xs text-black">810</div>
            <div className="font-semibold text-xs">RESOLVED</div>
          </div>
        </div>
        
        <div className="h-4 border-l-2 border-black" />
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-black" />
          <span className="text-xs">END</span>
        </div>
      </div>
    </div>
  );
}
