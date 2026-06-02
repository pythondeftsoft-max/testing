import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure1SystemArchitecture() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 1 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-8 border-b-2 border-black pb-2">
        FIG. 1 – System Architecture Diagram
      </h2>
      
      <div className="flex-1 flex flex-col items-center pt-8 gap-2">
        {/* Client Layer */}
        <div className="border-2 border-black p-4 text-center w-72 bg-white">
          <div className="text-xs text-black mb-1">101</div>
          <div className="font-semibold">Client Application</div>
          <div className="text-xs">(Web Browser / Mobile App)</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-6 border-l-2 border-black" />
          <div className="text-xs">▼</div>
        </div>
        
        {/* API Gateway */}
        <div className="border-2 border-black p-4 text-center w-72 bg-white">
          <div className="text-xs text-black mb-1">102</div>
          <div className="font-semibold">API Gateway</div>
          <div className="text-xs">(Supabase Edge Functions)</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-6 border-l-2 border-black" />
          <div className="text-xs">▼</div>
        </div>
        
        {/* Core Services Row */}
        <div className="flex gap-4 flex-wrap justify-center">
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">103</div>
            <div className="font-semibold text-xs">Auth Service</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">104</div>
            <div className="font-semibold text-xs">Payment Service</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">105</div>
            <div className="font-semibold text-xs">Property Service</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-36 bg-white">
            <div className="text-xs text-black mb-1">106</div>
            <div className="font-semibold text-xs">Tenant Service</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-6 border-l-2 border-black" />
          <div className="text-xs">▼</div>
        </div>
        
        {/* Database Layer */}
        <div className="border-2 border-black p-4 text-center w-80 bg-white">
          <div className="text-xs text-black mb-1">107</div>
          <div className="font-semibold">PostgreSQL Database</div>
          <div className="text-xs">(Supabase - Row Level Security)</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="h-6 border-l-2 border-black" />
          <div className="text-xs">▼</div>
        </div>
        
        {/* External Integrations */}
        <div className="flex gap-4 flex-wrap justify-center">
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black mb-1">108</div>
            <div className="font-semibold text-xs">Stripe</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black mb-1">109</div>
            <div className="font-semibold text-xs">Resend Email</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black mb-1">110</div>
            <div className="font-semibold text-xs">Storage</div>
          </div>
        </div>
      </div>
    </div>
  );
}
