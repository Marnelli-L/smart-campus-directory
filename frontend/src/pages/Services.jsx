import React from "react";

function Services() {
  const services = [
    {
      name: "Library Services",
      description: "Access books, journals, and digital resources at the campus library.",
      icon: "📚",
      openingHours: "8:00 AM - 6:00 PM",
      contact: "library@udm.edu.ph | (02) 123-4567",
      location: "3rd Floor, Main Building",
    },
    {
      name: "Health Services",
      description: "Visit the campus clinic for medical consultations and assistance.",
      icon: "🏥",
      openingHours: "8:00 AM - 5:00 PM",
      contact: "clinic@udm.edu.ph | (02) 765-4321",
      location: "Ground Floor, Wellness Center",
    },
    {
      name: "ICTO Support",
      description: "Get help with campus Wi-Fi, software, and technical issues.",
      icon: "💻",
      openingHours: "9:00 AM - 5:00 PM",
      contact: "itsupport@udm.edu.ph | (02) 987-6543",
      location: "2nd Floor, IT Department",
    },
    {
      name: "Counseling Services",
      description: "Speak with professional counselors for guidance and support.",
      icon: "🧠",
      openingHours: "9:00 AM - 4:00 PM",
      contact: "counseling@udm.edu.ph | (02) 456-7890",
      location: "1st Floor, Student Affairs Office",
    },
    {
      name: "Student Affairs",
      description: "Engage in student activities and access administrative support.",
      icon: "🎓",
      openingHours: "8:00 AM - 5:00 PM",
      contact: "studentaffairs@udm.edu.ph | (02) 321-6547",
      location: "Ground Floor, Administration Building",
    },
    {
      name: "University Registrar",
      description: "Handle enrollment, academic records, and certifications.",
      icon: "📝",
      openingHours: "8:00 AM - 5:00 PM",
      contact: "registrar@udm.edu.ph | (02) 654-3210",
      location: "Ground Floor, Registrar's Office",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-center mb-6 text-green-800">
        Campus Services
      </h1>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <div
            key={index}
            className="p-4 border rounded-md shadow hover:shadow-lg transition duration-300 bg-white"
            style={{
              borderColor: "#00594A",
            }}
          >
            <div
              className="text-4xl mb-3 text-center"
              style={{ color: "#00594A" }}
            >
              {service.icon}
            </div>
            <h2
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "#00594A" }}
            >
              {service.name}
            </h2>
            <p className="text-gray-600 text-center mb-3 text-sm">{service.description}</p>
            <div className="text-xs text-gray-700">
              <p><strong>Opening Hours:</strong> {service.openingHours}</p>
              <p><strong>Contact:</strong> {service.contact}</p>
              <p><strong>Location:</strong> {service.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Services;
