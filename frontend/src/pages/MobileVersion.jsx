import React from "react";
import { MdPhoneIphone } from "react-icons/md";
import { useNavigate } from "react-router-dom";

function MobileVersion() {
  const navigate = useNavigate();
  
  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // If user is on mobile, redirect to home page since this page is for kiosks only
  React.useEffect(() => {
    if (isMobile) {
      navigate('/');
    }
  }, [isMobile, navigate]);
  
  // Don't render anything on mobile devices
  if (isMobile) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex items-start justify-center bg-white px-3 sm:px-4 py-4 sm:py-8 font-sans">
      <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-3xl gap-6 sm:gap-8 md:gap-14 mt-4 sm:mt-10">
        {/* Left: QR Code Card */}
        <div className="flex flex-col items-center w-full max-w-xs">
          <div className="flex flex-col items-center bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-2 w-full">
            <MdPhoneIphone size={32} className="text-[#00695C] mb-2 sm:hidden" />
            <MdPhoneIphone size={36} className="text-[#00695C] mb-2 hidden sm:block" />
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#00695C] mb-3 text-center leading-snug">
              Scan to Access UDM Smart Campus Directory
            </h2>
            <img
              src="/public/images/frame.png"
              alt="Scan to open UDM Smart Campus Directory"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg border border-[#e5e7eb] bg-white"
            />
          </div>
          <p className="text-xs sm:text-sm text-gray-700 text-center max-w-xs mt-2 px-2">
            <strong>Scan this QR code</strong> with your smartphone camera to open
            the UDM Smart Campus Directory mobile web app.
          </p>
        </div>

        {/* Right: Instructions and Benefits */}
        <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-sm mt-4 sm:mt-8 md:mt-0 px-2 sm:px-0">
          {/* Instructions */}
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-[#00695C] mb-2">
              How to Use
            </h3>
            <ol className="list-decimal list-inside text-gray-700 text-sm sm:text-base space-y-1.5 sm:space-y-1 pl-2">
              <li className="leading-relaxed">Open your smartphone's camera or QR code scanner app.</li>
              <li className="leading-relaxed">Point the camera at the QR code.</li>
              <li className="leading-relaxed">Tap the link that appears to access the directory.</li>
            </ol>
          </div>
          {/* Benefits */}
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-[#00695C] mb-2">
              Why Use the Mobile Directory?
            </h3>
            <ul className="list-disc list-inside text-gray-700 text-sm sm:text-base space-y-1.5 sm:space-y-1 pl-2">
              <li className="leading-relaxed">Easy campus navigation on the go</li>
              <li className="leading-relaxed">Real-time updates and announcements</li>
              <li className="leading-relaxed">Offline access to maps and directory info</li>
              <li className="leading-relaxed">Quick search for buildings, services, and staff</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileVersion;

