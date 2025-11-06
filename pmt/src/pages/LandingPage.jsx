import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import aiAnimation from '../assets/ai-animation.json';
import { 
  CheckIcon, 
  ChevronDownIcon, 
  XMarkIcon, 
  Bars3Icon, 
  PlusIcon, 
  MinusIcon,
  PlayIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { 
  ShieldCheckIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  RocketLaunchIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

const FlowAILanding = () => {
  const { t, i18n } = useTranslation();

  // State management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePricingTab, setActivePricingTab] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState('team');
  const [resources, setResources] = useState({
    storage: { type: 'ssd', amount: 50 },
    compute: { type: 'standard', hours: 100 },
    memory: { amount: 200 },
    users: 5
  });
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [totalPrice, setTotalPrice] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Pricing configuration
  const BASE_PRICES = {
    solo: { 
      monthly: 14.99, 
      annual: 12.74,
      features: [
        '5 active projects',
        '15GB storage',
        'Basic integrations',
        'AI-assisted reporting'
      ],
      limits: {
        maxUsers: 5,
        maxStorage: 100,
        maxCompute: 200
      }
    },
    team: { 
      monthly: 49, 
      annual: 41.65,
      features: [
        'Unlimited projects',
        '50GB storage',
        'Advanced AI',
        'CRM Integration'
      ],
      limits: {
        maxUsers: 50,
        maxStorage: 1000,
        maxCompute: 1000
      }
    },
    enterprise: { 
      monthly: 89, 
      annual: 75.65,
      features: [
        'Custom AI Training',
        'Dedicated Support',
        '99.9% SLA',
        'Advanced Security'
      ],
      limits: {
        maxUsers: 1000,
        maxStorage: 10000,
        maxCompute: 10000
      }
    }
  };

  const RESOURCE_PRICES = {
    storage: {
      ssd: 0.25,
      hdd: 0.10
    },
    compute: {
      standard: 0.09,
      high_performance: 0.15,
      gpu: 0.50
    },
    memory: 0.035,
    users: {
      solo: 0,
      team: 5,
      enterprise: 10
    }
  };

  const ADDONS = [
    { 
      id: 'ai-analytics', 
      name: 'Advanced AI Analytics', 
      price: 15,
      icon: <ChartBarIcon className="w-5 h-5" />,
      description: 'Predictive insights and advanced reporting'
    },
    { 
      id: 'workflow-automation', 
      name: 'Workflow Automation', 
      price: 9,
      icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
      description: 'Automate repetitive tasks and approvals'
    },
    { 
      id: 'premium-support', 
      name: '24/7 Premium Support', 
      price: 299,
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      description: 'Priority support with 1-hour response time'
    }
  ];

  const FEATURES = [
    {
      title: "AI-Powered Automation",
      description: "Intelligent task assignment and risk prediction",
      icon: <CogIcon className="w-8 h-8 text-indigo-600" />
    },
    {
      title: "Real-Time Collaboration",
      description: "Seamless team communication with video and chat",
      icon: <UsersIcon className="w-8 h-8 text-indigo-600" />
    },
    {
      title: "Scalable Infrastructure",
      description: "Grow from solo to enterprise without switching platforms",
      icon: <RocketLaunchIcon className="w-8 h-8 text-indigo-600" />
    }
  ];

  // Calculate total price whenever dependencies change
  useEffect(() => {
    calculateTotalPrice();
  }, [selectedPlan, resources, selectedAddons, activePricingTab]);

  const calculateTotalPrice = () => {
    let base = BASE_PRICES[selectedPlan][activePricingTab];
    
    // Storage cost
    const storageCost = resources.storage.amount * 
      RESOURCE_PRICES.storage[resources.storage.type] *
      (activePricingTab === 'annual' ? 12 : 1);

    // Compute cost
    const computeCost = resources.compute.hours * 
      RESOURCE_PRICES.compute[resources.compute.type] *
      (activePricingTab === 'annual' ? 12 : 1);

    // Memory cost
    const memoryCost = resources.memory.amount * RESOURCE_PRICES.memory *
      (activePricingTab === 'annual' ? 12 : 1);

    // User cost (only for additional users beyond plan limits)
    const includedUsers = RESOURCE_PRICES.users[selectedPlan];
    const userCost = Math.max(0, resources.users - includedUsers) * 5 *
      (activePricingTab === 'annual' ? 12 : 1);

    // Addons cost
    const addonsCost = Array.from(selectedAddons).reduce((acc, addonId) => {
      const addon = ADDONS.find(a => a.id === addonId);
      return acc + (addon.price * (activePricingTab === 'annual' ? 12 : 1));
    }, 0);

    setTotalPrice(base + storageCost + computeCost + memoryCost + userCost + addonsCost);
  };

  const handleResourceChange = (resource, value) => {
    const planLimits = BASE_PRICES[selectedPlan].limits;
    
    // Apply plan limits
    let adjustedValue = value;
    if (resource === 'storage') {
      adjustedValue = Math.min(value, planLimits.maxStorage);
    } else if (resource === 'compute') {
      adjustedValue = Math.min(value, planLimits.maxCompute);
    } else if (resource === 'users') {
      adjustedValue = Math.min(value, planLimits.maxUsers);
    }

    setResources(prev => ({
      ...prev,
      [resource]: typeof value === 'object' ? 
        { ...prev[resource], ...adjustedValue } : 
        { ...prev[resource], amount: adjustedValue }
    }));
    
    // Display feedback message
    setFeedbackMessage(t('landing.resources.updated', { resource: t(`landing.resources.${resource}`) }));
  };

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(addonId)) {
        newSet.delete(addonId);
        setFeedbackMessage(t('landing.addons.removed', { addon: t(`landing.addons.${addonId}.name`) }));
      } else {
        newSet.add(addonId);
        setFeedbackMessage(t('landing.addons.added', { addon: t(`landing.addons.${addonId}.name`) }));
      }
      return newSet;
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Pricing Calculator Component
  const PricingCalculator = () => (
    <div className="mt-12 space-y-8" style={{ width: '90%', margin: '0 auto' }}>
      {/* Plan Selection */}
      <div className="grid gap-6 md:grid-cols-3">
        {Object.entries(BASE_PRICES).map(([planKey, planData]) => (
          <div
            key={planKey}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedPlan === planKey 
                ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <h3 className="text-xl font-bold capitalize">{planKey}</h3>
            <div className="my-4">
              <span className="text-3xl font-bold">
                {formatPrice(planData[activePricingTab])}
              </span>
              <span className="text-gray-600">/month</span>
              {activePricingTab === 'annual' && (
                <p className="text-sm text-green-600 mt-1">
                  Save {Math.round((1 - planData.annual / planData.monthly) * 100)}% annually
                </p>
              )}
            </div>
            <ul className="space-y-2 mb-6">
              {planData.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedPlan(planKey)}
              className={`w-full py-2 rounded-md transition-colors ${
                selectedPlan === planKey
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedPlan === planKey ? 'Selected' : 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Resource Configuration */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="text-lg font-semibold mb-4">Configure Resources</h4>
        <div className="space-y-6">
          {/* Storage Configuration */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Storage</label>
              <span className="text-sm text-gray-500">
                Max: {BASE_PRICES[selectedPlan].limits.maxStorage}GB
              </span>
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleResourceChange('storage', { type: 'ssd' })}
                className={`px-3 py-1 rounded text-sm ${
                  resources.storage.type === 'ssd' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                SSD (Faster)
              </button>
              <button
                onClick={() => handleResourceChange('storage', { type: 'hdd' })}
                className={`px-3 py-1 rounded text-sm ${
                  resources.storage.type === 'hdd' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                HDD (Economy)
              </button>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max={BASE_PRICES[selectedPlan].limits.maxStorage}
                value={resources.storage.amount}
                onChange={(e) => handleResourceChange('storage', parseInt(e.target.value))}
                className="w-full"
              />
              <span className="w-20 text-right font-medium">
                {resources.storage.amount}GB
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {resources.storage.type === 'ssd' ? 
                `$${RESOURCE_PRICES.storage.ssd}/GB/month` : 
                `$${RESOURCE_PRICES.storage.hdd}/GB/month`}
            </p>
          </div>

          {/* Compute Configuration */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Compute Hours</label>
              <span className="text-sm text-gray-500">
                Max: {BASE_PRICES[selectedPlan].limits.maxCompute} hours
              </span>
            </div>
            <div className="flex gap-2 mb-2">
              {Object.entries(RESOURCE_PRICES.compute).map(([type, price]) => (
                <button
                  key={type}
                  onClick={() => handleResourceChange('compute', { type })}
                  className={`px-3 py-1 rounded text-sm capitalize ${
                    resources.compute.type === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {type.replace('_', ' ')} (${price}/hour)
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max={BASE_PRICES[selectedPlan].limits.maxCompute}
                value={resources.compute.hours}
                onChange={(e) => handleResourceChange('compute', { hours: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="w-20 text-right font-medium">
                {resources.compute.hours} hours
              </span>
            </div>
          </div>

          {/* Users Configuration */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Team Members</label>
              <span className="text-sm text-gray-500">
                Max: {BASE_PRICES[selectedPlan].limits.maxUsers} users
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max={BASE_PRICES[selectedPlan].limits.maxUsers}
                value={resources.users}
                onChange={(e) => handleResourceChange('users', parseInt(e.target.value))}
                className="w-full"
              />
              <span className="w-20 text-right font-medium">
                {resources.users} users
              </span>
            </div>
            {resources.users > RESOURCE_PRICES.users[selectedPlan] && (
              <p className="text-xs text-gray-500">
                ${5}/month per additional user
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add-ons Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="text-lg font-semibold mb-4">Add-ons</h4>
        <div className="grid gap-4 md:grid-cols-3">
          {ADDONS.map(addon => (
            <div
              key={addon.id}
              className={`p-4 rounded border-2 cursor-pointer transition-all ${
                selectedAddons.has(addon.id)
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
              onClick={() => toggleAddon(addon.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedAddons.has(addon.id) 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {addon.icon}
                  </div>
                  <div>
                    <h5 className="font-medium">{addon.name}</h5>
                    <p className="text-sm text-gray-600">
                      {formatPrice(addon.price)}/month
                    </p>
                  </div>
                </div>
                {selectedAddons.has(addon.id) ? (
                  <MinusIcon className="w-5 h-5 text-indigo-600" />
                ) : (
                  <PlusIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {addon.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-indigo-50 p-6 rounded-xl border-2 border-indigo-100">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Estimated Monthly Cost</h3>
            <p className="text-gray-600">Billed {activePricingTab}ly</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-700">
              {formatPrice(totalPrice)}
            </div>
            {activePricingTab === 'annual' && (
              <p className="text-sm text-green-600">
                (Save {formatPrice(totalPrice * 12 - (totalPrice * 12 * 0.85))} annually)
              </p>
            )}
          </div>
        </div>
        <button className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          Start Free 14-Day Trial <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <svg className="h-8 w-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
                <span className="ml-2 text-xl font-bold text-gray-900">FlowAI</span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Pricing</a>
              <a href="#resources" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">Resources</a>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                Get Started
              </button>
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" className="text-gray-700 block px-3 py-2 rounded-md text-base font-medium">Features</a>
              <a href="#pricing" className="text-gray-700 block px-3 py-2 rounded-md text-base font-medium">Pricing</a>
              <a href="#resources" className="text-gray-700 block px-3 py-2 rounded-md text-base font-medium">Resources</a>
              <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-indigo-700">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Project Management{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Supercharged by AI
                </span>
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Automate workflows, predict risks, and collaborate smarter with our intelligent platform. 
                Pay only for what you use with cloud-style pricing.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button className="bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-700 transition-colors">
                  Start Free Trial
                </button>
                <button 
                  onClick={() => setShowVideoModal(true)}
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md text-lg font-medium hover:border-indigo-500 transition-colors flex items-center justify-center"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Watch Demo
                </button>
              </div>
              <div className="mt-8 flex items-center">
                <div className="flex -space-x-2">
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/12.jpg" alt="User" />
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
                  <img className="w-10 h-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/45.jpg" alt="User" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Trusted by 5,000+ teams</p>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                    <span className="ml-1 text-xs text-gray-500">(4.9/5)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Lottie
               animationData={aiAnimation}
               loop={true}
               autoplay={true}
               style={{ height: 400 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              From task automation to predictive analytics, FlowAI has you covered
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Pay only for what you need with our flexible plans
            </p>
            <div className="mt-4 flex justify-center items-center space-x-2">
              <button
                onClick={() => setActivePricingTab('monthly')}
                className={`px-4 py-2 rounded-md ${
                  activePricingTab === 'monthly'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setActivePricingTab('annual')}
                className={`px-4 py-2 rounded-md ${
                  activePricingTab === 'annual'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Annual (15% off)
              </button>
            </div>
          </div>
          <PricingCalculator />
        </div>
      </section>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative w-full max-w-4xl bg-white rounded-lg overflow-hidden">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="FlowAI Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowAILanding;