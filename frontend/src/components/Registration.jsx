import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * Registration.jsx ? Component for creating a new MalIntent firewall account with Email OTP.
 */
export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    dob_month: "",
    dob_day: "",
    dob_year: "",
    sex: "",
    country: "",
    state: "",
    email: "",
    phone: "",
    password: "",
    retype_password: "",
  });

  const [otpCode, setOtpCode] = useState("");

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.retype_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        dob: `${formData.dob_month} ${formData.dob_day} ${formData.dob_year}`,
        sex: formData.sex,
        country: formData.country,
        state: formData.state,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      };

      const baseURL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      // Adjust endpoint based on backend setup, authentication.py routes are typically mounted at /api/v1 or root depending on main.py
      // Assuming they are mounted cleanly:
      await axios.post(`${baseURL}/register`, payload);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Registration failed. Please check your inputs.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const baseURL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await axios.post(`${baseURL}/verify-otp`, {
        email: formData.email,
        otp_code: otpCode,
      });

      // Store token
      localStorage.setItem("malintent_token", res.data.access_token);

      // Navigate to dashboard
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[#161b22] border border-slate-700/50 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            MalIntent <span className="text-blue-500">Secure</span> Registration
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Create your firewall administration account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  First Name *
                </label>
                <input
                  required
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Last Name *
                </label>
                <input
                  required
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* DOB & Sex Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Month *
                  </label>
                  <select
                    required
                    name="dob_month"
                    value={formData.dob_month}
                    onChange={handleInputChange}
                    className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Month</option>
                    {[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Day *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="31"
                    name="dob_day"
                    value={formData.dob_day}
                    onChange={handleInputChange}
                    className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="DD"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Year *
                  </label>
                  <input
                    required
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    name="dob_year"
                    value={formData.dob_year}
                    onChange={handleInputChange}
                    className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="YYYY"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Sex *
                </label>
                <select
                  required
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Location Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Country *
                </label>
                <input
                  required
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  State/Province *
                </label>
                <input
                  required
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contact Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Password *
                </label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-7 text-xs text-slate-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Retype Password *
                </label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  name="retype_password"
                  value={formData.retype_password}
                  onChange={handleInputChange}
                  className="w-full bg-[#0a0c10] border border-slate-700 rounded-md p-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Register Account"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-4">??</div>
              <h2 className="text-xl font-semibold mb-2">Verify Your Email</h2>
              <p className="text-sm text-slate-400">
                We've sent a 6-digit one-time password to{" "}
                <b>{formData.email}</b>. Please enter it below to activate your
                account.
              </p>
            </div>

            <div>
              <input
                required
                type="text"
                maxLength="6"
                placeholder="? ? ? ? ? ?"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-2xl font-mono bg-[#0a0c10] border border-slate-700 rounded-md p-4 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Complete Registration"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                ? Back to Registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
