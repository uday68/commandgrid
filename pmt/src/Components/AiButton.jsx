import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

// Register GSAP plugins
gsap.registerPlugin(MotionPathPlugin);

const AIButton = ({ onClick }) => {
  const buttonRef = useRef(null);
  const particles = useRef([]);
  const paths = useRef([]);
  const tl = useRef(null);

  useEffect(() => {
    // Initialize particles
    particles.current = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      active: false
    }));

    // Create cyber circuit animation timeline
    tl.current = gsap.timeline({ repeat: -1 });
    
    // Create initial paths
    paths.current = [
      { d: "M20,50 Q50,20 80,50", length: 100 },
      { d: "M20,50 Q50,80 80,50", length: 100 },
      { d: "M35,35 L65,65", length: 42 },
      { d: "M35,65 L65,35", length: 42 }
    ];

    // Animate each path
    paths.current.forEach((path, i) => {
      tl.current.to(path, {
        duration: 1.5,
        strokeDashoffset: -path.length,
        ease: "power1.inOut",
        repeat: 1,
        yoyo: true
      }, i * 0.2);
    });

    // Particle animation
    particles.current.forEach((particle, i) => {
      gsap.to(particle, {
        duration: 2 + Math.random() * 2,
        x: () => Math.random() * 60 - 30,
        y: () => Math.random() * 60 - 30,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: i * 0.15
      });
    });

    // Hover effects
    const hoverTl = gsap.timeline({ paused: true });
    hoverTl.to(buttonRef.current, {
      scale: 1.1,
      duration: 0.3,
      ease: "back.out(1.7)"
    }).to(".ai-core", {
      rotate: 45,
      duration: 0.8,
      ease: "elastic.out(1, 0.5)"
    }, 0);

    buttonRef.current.addEventListener("mouseenter", () => hoverTl.play());
    buttonRef.current.addEventListener("mouseleave", () => hoverTl.reverse());

    return () => {
      hoverTl.kill();
      tl.current.kill();
      gsap.globalTimeline.clear();
    };
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <button
        ref={buttonRef}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700
                 shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden
                 backdrop-blur-sm border border-white/10 group"
        onClick={onClick}
        aria-label="AI Assistant"
      >
        {/* Cyber circuit paths */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full opacity-60"
        >
          {paths.current.map((path, i) => (
            <path
              key={i}
              d={path.d}
              stroke="url(#cyber-glow)"
              strokeWidth="0.8"
              fill="none"
              strokeDasharray="4 6"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Quantum particles */}
        <div className="absolute inset-0">
          {particles.current.map(particle => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                transform: `translate(${particle.x}px, ${particle.y}px)`,
                opacity: 0.6
              }}
            />
          ))}
        </div>

        {/* AI core symbol */}
        <div className="relative z-10 ai-core">
          <svg 
            viewBox="0 0 24 24" 
            className="w-8 h-8 text-white mx-auto transform transition-all duration-500"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="currentColor"
              className="opacity-20"
            />
            <path
              d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              fill="currentColor"
              className="opacity-40"
            />
            <path
              d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
              fill="currentColor"
              className="opacity-80"
            />
          </svg>
        </div>

        {/* Gradient definition */}
        <svg className="absolute w-0 h-0">
          <defs>
            <linearGradient id="cyber-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </button>
    </div>
  );
};

export default AIButton;