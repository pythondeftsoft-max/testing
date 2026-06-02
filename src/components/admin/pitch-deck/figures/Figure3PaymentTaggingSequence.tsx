import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure3PaymentTaggingSequence() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 3 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 3 – Payment Tagging Sequence Diagram
      </h2>
      
      <div className="flex-1 pt-4">
        {/* Actors */}
        <div className="flex justify-between px-8 mb-4">
          <div className="text-center">
            <div className="border-2 border-black p-2 w-24 bg-white">
              <div className="text-xs text-black">301</div>
              <div className="font-semibold text-xs">User</div>
            </div>
            <div className="h-[400px] border-l-2 border-black mx-auto w-0 border-dashed" />
          </div>
          <div className="text-center">
            <div className="border-2 border-black p-2 w-24 bg-white">
              <div className="text-xs text-black">302</div>
              <div className="font-semibold text-xs">Frontend</div>
            </div>
            <div className="h-[400px] border-l-2 border-black mx-auto w-0 border-dashed" />
          </div>
          <div className="text-center">
            <div className="border-2 border-black p-2 w-24 bg-white">
              <div className="text-xs text-black">303</div>
              <div className="font-semibold text-xs">API</div>
            </div>
            <div className="h-[400px] border-l-2 border-black mx-auto w-0 border-dashed" />
          </div>
          <div className="text-center">
            <div className="border-2 border-black p-2 w-24 bg-white">
              <div className="text-xs text-black">304</div>
              <div className="font-semibold text-xs">Database</div>
            </div>
            <div className="h-[400px] border-l-2 border-black mx-auto w-0 border-dashed" />
          </div>
        </div>
        
        {/* Sequence Steps - Overlaid on lifelines */}
        <div className="relative -mt-[400px] px-8 space-y-6">
          {/* Step 1 */}
          <div className="flex items-center ml-12">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">1. Select Payment</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex items-center ml-32">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">2. Load Properties</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex items-center ml-48">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">3. Query Properties</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 4 - Return */}
          <div className="flex items-center ml-48">
            <div className="flex-1 border-t-2 border-black border-dashed relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">4. Return Data</div>
              <div className="absolute left-0 top-[-4px]">←</div>
            </div>
          </div>
          
          {/* Step 5 */}
          <div className="flex items-center ml-12">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">5. Tag to Property</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 6 */}
          <div className="flex items-center ml-32">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">6. Save Tag</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 7 */}
          <div className="flex items-center ml-48">
            <div className="flex-1 border-t-2 border-black relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">7. Insert Record</div>
              <div className="absolute right-0 top-[-4px]">→</div>
            </div>
          </div>
          
          {/* Step 8 - Confirm */}
          <div className="flex items-center ml-12">
            <div className="flex-1 border-t-2 border-black border-dashed relative">
              <div className="absolute -top-4 left-1/4 text-xs bg-white px-1">8. Confirm Success</div>
              <div className="absolute left-0 top-[-4px]">←</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
