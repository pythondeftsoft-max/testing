import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure5PaymentProcessing() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 5 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 5 – End-to-End Payment Processing Flowchart
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-6 gap-3">
        {/* Start */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-black" />
          <span className="text-xs">START</span>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Rent Due */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">501</div>
          <div className="font-semibold text-sm">Rent Due Date Reached</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Generate Invoice */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">502</div>
          <div className="font-semibold text-sm">Generate Invoice</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Notify Tenant */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">503</div>
          <div className="font-semibold text-sm">Send Payment Reminder</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Decision: Autopay? */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white transform rotate-0" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
          <div className="text-xs text-black">504</div>
          <div className="font-semibold text-xs">Autopay<br/>Enabled?</div>
        </div>
        
        {/* Branch */}
        <div className="flex items-start gap-12">
          {/* No - Manual */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">No</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white">
              <div className="text-xs text-black">505</div>
              <div className="font-semibold text-xs">Manual Payment</div>
              <div className="text-xs">(Stripe Checkout)</div>
            </div>
          </div>
          
          {/* Yes - Autopay */}
          <div className="flex flex-col items-center">
            <div className="text-xs mb-2">Yes</div>
            <div className="border-2 border-black p-2 text-center w-36 bg-white">
              <div className="text-xs text-black">506</div>
              <div className="font-semibold text-xs">Process Autopay</div>
              <div className="text-xs">(Stripe Intent)</div>
            </div>
          </div>
        </div>
        
        {/* Merge */}
        <div className="h-3 border-l-2 border-black mt-2" />
        <div className="text-xs">▼</div>
        
        {/* Record Payment */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">507</div>
          <div className="font-semibold text-sm">Record Payment</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Update Balances */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">508</div>
          <div className="font-semibold text-sm">Update Tenant Balance</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        <div className="text-xs">▼</div>
        
        {/* Send Receipt */}
        <div className="border-2 border-black p-3 text-center w-52 bg-white">
          <div className="text-xs text-black mb-1">509</div>
          <div className="font-semibold text-sm">Send Receipt</div>
        </div>
        
        <div className="h-3 border-l-2 border-black" />
        
        {/* End */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-black" />
          <span className="text-xs">END</span>
        </div>
      </div>
    </div>
  );
}
