import { useState,useEffect } from 'react';
export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
   
  const openlink=() =>{
    window.location.href="/login"
  }


  const features = [
    {
      title: "AI Task Assistant",
      icon: "🤖",
      desc: "Automated task prioritization and smart suggestions"
    },
    {
      title: "3D Project Mapping",
      icon: "🗺️",
      desc: "Visualize projects in interactive 3D space"
    },
    {
      title: "Real-time Collaboration",
      icon: "👥",
      desc: "Multi-user whiteboard and video conferencing"
    },
    {
      title: "Health Analytics",
      icon: "❤️",
      desc: "Team wellbeing monitoring and workload balance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">NexaFlow</h1>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-blue-600">Features</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Pricing</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Resources</a>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              onClick={openlink}>
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white">
          <div className="px-4 pt-20 pb-8 space-y-4">
            <a href="#" className="block text-gray-600 text-lg">Features</a>
            <a href="#" className="block text-gray-600 text-lg">Pricing</a>
            <a href="#" className="block text-gray-600 text-lg">Resources</a>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg w-full">
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Revolutionize Your Workflow with 
            <span className="text-blue-600"> AI-Powered</span> Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Collaborate smarter with predictive task management, 3D project visualization, 
            and real-time health analytics for your team.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg hover:bg-blue-700">
              Start Free Trial
            </button>
            <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-xl text-lg hover:bg-blue-50">
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant Floating Button */}
      <div className="fixed bottom-8 right-8">
        <button className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors 
          animate-bounce">
          <span className="text-2xl">🤖</span>
          <span className="sr-only">AI Assistant</span>
        </button>
      </div>
    </div>
  );
}