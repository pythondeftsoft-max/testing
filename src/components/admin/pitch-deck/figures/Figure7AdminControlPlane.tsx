import React from 'react';

const patentFontStyle = { fontFamily: 'Helvetica, Arial, sans-serif' };

export function Figure7AdminControlPlane() {
  return (
    <div className="w-full h-full flex flex-col text-sm text-black relative" style={patentFontStyle}>
      {/* Sheet number for USPTO compliance */}
      <div className="absolute top-0 right-0 text-xs font-normal">Sheet 7 of 8</div>
      
      <h2 className="text-center text-lg font-bold mb-6 border-b-2 border-black pb-2">
        FIG. 7 – Administrative Control Plane Architecture
      </h2>
      
      <div className="flex-1 pt-6">
        {/* Admin User */}
        <div className="flex justify-center mb-6">
          <div className="border-2 border-black p-4 text-center w-48 bg-white">
            <div className="text-xs text-black mb-1">701</div>
            <div className="font-semibold">Admin User</div>
            <div className="text-xs">(Authenticated)</div>
          </div>
        </div>
        
        {/* Arrow Down */}
        <div className="flex justify-center mb-4">
          <div className="flex flex-col items-center">
            <div className="h-6 border-l-2 border-black" />
            <div className="text-xs">▼</div>
          </div>
        </div>
        
        {/* Control Plane Box */}
        <div className="border-2 border-black mx-8 p-4">
          <div className="text-center font-bold mb-4 border-b border-black pb-2">
            <span className="text-xs text-black">702 - </span>
            ADMIN CONTROL PLANE
          </div>
          
          {/* Three Columns */}
          <div className="flex gap-4 justify-center flex-wrap">
            {/* Access Control */}
            <div className="border border-black p-3 w-44">
              <div className="text-center font-semibold text-xs mb-2 border-b border-black pb-1">
                <span className="text-black">703 - </span>Access Control
              </div>
              <div className="text-xs space-y-1">
                <div>• Role Management</div>
                <div>• Permission Grants</div>
                <div>• Access Requests</div>
                <div>• Session Control</div>
              </div>
            </div>
            
            {/* Audit & Compliance */}
            <div className="border border-black p-3 w-44">
              <div className="text-center font-semibold text-xs mb-2 border-b border-black pb-1">
                <span className="text-black">704 - </span>Audit System
              </div>
              <div className="text-xs space-y-1">
                <div>• Action Logging</div>
                <div>• Change Tracking</div>
                <div>• Compliance Reports</div>
                <div>• Data Retention</div>
              </div>
            </div>
            
            {/* Security */}
            <div className="border border-black p-3 w-44">
              <div className="text-center font-semibold text-xs mb-2 border-b border-black pb-1">
                <span className="text-black">705 - </span>Security
              </div>
              <div className="text-xs space-y-1">
                <div>• RLS Policies</div>
                <div>• Encryption</div>
                <div>• MFA Enforcement</div>
                <div>• Threat Detection</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Arrow Down */}
        <div className="flex justify-center my-4">
          <div className="flex flex-col items-center">
            <div className="h-6 border-l-2 border-black" />
            <div className="text-xs">▼</div>
          </div>
        </div>
        
        {/* Protected Resources */}
        <div className="flex justify-center gap-4 flex-wrap px-8">
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black">706</div>
            <div className="font-semibold text-xs">User Data</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black">707</div>
            <div className="font-semibold text-xs">Properties</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black">708</div>
            <div className="font-semibold text-xs">Payments</div>
          </div>
          <div className="border-2 border-black p-3 text-center w-32 bg-white">
            <div className="text-xs text-black">709</div>
            <div className="font-semibold text-xs">Documents</div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 mx-8 border border-black p-3 text-xs">
          <div className="font-bold mb-1">LEGEND:</div>
          <div>All admin actions are logged and subject to RLS policies</div>
        </div>
      </div>
    </div>
  );
}
