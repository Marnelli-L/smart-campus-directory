import React from "react";
import { MdPhoneIphone } from "react-icons/md";

function MobileVersion() {
  return (
    <div className="min-h-screen flex items-start justify-center bg-white px-4 py-8 font-sans">
      <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-3xl gap-8 md:gap-14 mt-10">
        {/* Left: QR Code Card */}
        <div className="flex flex-col items-center w-full max-w-xs">
          <div className="flex flex-col items-center bg-white rounded-2xl shadow-xl p-6 mb-2 w-full">
            <MdPhoneIphone size={36} className="text-[#00695C] mb-2" />
            <h2 className="text-lg md:text-xl font-bold text-[#00695C] mb-3 text-center">
              Scan to Access UDM Smart Campus Directory
            </h2>
            <img
              src="/public/images/frame.png"
              alt="Scan to open UDM Smart Campus Directory"
              className="w-40 h-40 rounded-lg border border-[#e5e7eb] bg-white"
            />
          </div>
          <p className="text-sm text-gray-700 text-center max-w-xs mt-2">
            <strong>Scan this QR code</strong> with your smartphone camera to open
            the UDM Smart Campus Directory mobile web app.
          </p>
        </div>

        {/* Right: Instructions and Benefits */}
        <div className="flex flex-col gap-5 w-full max-w-sm mt-8 md:mt-0">
          {/* Instructions */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-[#00695C] mb-2">
              How to Use
            </h3>
            <ol className="list-decimal list-inside text-gray-700 text-base space-y-1 pl-2">
              <li>Open your smartphone’s camera or QR code scanner app.</li>
              <li>Point the camera at the QR code.</li>
              <li>Tap the link that appears to access the directory.</li>
            </ol>
          </div>
          {/* Benefits */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-[#00695C] mb-2">
              Why Use the Mobile Directory?
            </h3>
            <ul className="list-disc list-inside text-gray-700 text-base space-y-1 pl-2">
              <li>Easy campus navigation on the go</li>
              <li>Real-time updates and announcements</li>
              <li>Offline access to maps and directory info</li>
              <li>Quick search for buildings, services, and staff</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileVersion;

