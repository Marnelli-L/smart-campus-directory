import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ setIsAuthenticated }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Clear any existing session on mount
    useEffect(() => {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    }, []);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        
        // Reset error state
        setError("");
        
        // Validate inputs
        if (!username.trim()) {
            setError("Please enter your username");
            return;
        }
        
        if (!password.trim()) {
            setError("Please enter your password");
            return;
        }
        
        setLoading(true);
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const response = await fetch(`${apiUrl}/api/admin/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ 
                    username: username.trim(), 
                    password: password.trim() 
                }),
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Store authentication data
                localStorage.setItem('adminAuthenticated', 'true');
                localStorage.setItem('adminUsername', username.trim()); // Store username for display
                if (data.token) {
                    localStorage.setItem('adminToken', data.token);
                }
                if (data.user) {
                    localStorage.setItem('adminUser', JSON.stringify(data.user));
                }
                
                console.log('✅ Login successful');
                
                // Update authentication state
                setIsAuthenticated(true);
                
                // Navigate to admin dashboard
                navigate("/admin", { replace: true });
            } else {
                // Handle login failure
                const errorMessage = data.message || "Invalid username or password";
                setError(errorMessage);
                console.warn('⚠️ Login failed:', errorMessage);
            }
        } catch (err) {
            console.error('❌ Login error:', err);
            setError("Unable to connect to server. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Image Background */}
            <div
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                style={{
                    backgroundImage: "url('/images/UDM_PICTURE.jpg')",
                }}
            ></div>

            {/* Overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-black/50"></div>

            {/* Login Form */}
            <div className="relative flex items-center justify-center h-full px-4">
                <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 w-full max-w-md sm:max-w-96">
                    <div className="text-center mb-4 sm:mb-6">
                        <img
                            src="/images/UDM_LOGO.png"
                            alt="UDM Logo"
                            className="w-24 sm:w-32 mx-auto mb-3 sm:mb-4"
                        />
                        <h1 className="text-xl sm:text-2xl font-bold text-[#00332E]">
                            Admin Login
                        </h1>
                        <p className="text-sm sm:text-base text-[#00332E]">Access the admin dashboard</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00332E] disabled:opacity-50 disabled:cursor-not-allowed"
                                autoComplete="username"
                            />
                        </div>
                        
                        <div>
                            <input
                                type="password"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00332E] disabled:opacity-50 disabled:cursor-not-allowed"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                                bg-[#00594A] text-white shadow-md hover:bg-[#00594A]/80 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;