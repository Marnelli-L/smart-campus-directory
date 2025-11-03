import { useState } from "react";

function ReportIssues() {
  const [form, setForm] = useState({
    issueType: "",
    location: "",
    description: "",
    contact: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would send the form data to your backend or API
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffffff] to-[#ffffff] flex items-center justify-center py-10">
      <div className="w-full max-w-xl p-8 bg-white/95 rounded-2xl shadow-xl border border-[#00594A]">
        <h1 className="text-3xl font-extrabold text-[#00332E] text-center mb-8 tracking-tight">
          Report an Issue
        </h1>
        {submitted ? (
          <div className="text-green-600 text-center text-lg font-medium">
            Thank you for reporting the issue. We will look into it soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                className="block font-semibold mb-2 text-[#00594A]"
                htmlFor="issueType"
              >
                Issue Type
              </label>
              <select
                id="issueType"
                name="issueType"
                value={form.issueType}
                onChange={handleChange}
                required
                className="w-full border border-[#00594A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#007763] bg-[#e6f4f1] transition"
              >
                <option value="">Select an issue type</option>
                <option value="building">School Building Maintenance</option>
                <option value="app">App / Directory Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label
                className="block font-semibold mb-2 text-[#00594A]"
                htmlFor="location"
              >
                Location (Room, Building, or App Section)
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                required
                className="w-full border border-[#00594A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#007763] bg-[#e6f4f1] transition"
                placeholder="e.g., Science Block, Room 101, Login Page"
              />
            </div>
            <div>
              <label
                className="block font-semibold mb-2 text-[#00594A]"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                className="w-full border border-[#00594A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#007763] bg-[#e6f4f1] transition"
                rows={4}
                placeholder="Describe the issue in detail"
              />
            </div>
            <div>
              <label
                className="block font-semibold mb-2 text-[#00594A]"
                htmlFor="contact"
              >
                Your Email (optional)
              </label>
              <input
                id="contact"
                name="contact"
                type="email"
                value={form.contact}
                onChange={handleChange}
                className="w-full border border-[#00594A] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#007763] bg-[#e6f4f1] transition"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#00594A] text-white py-3 rounded-lg font-bold text-lg shadow hover:bg-[#007763] transition"
            >
              Submit Issue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportIssues;
