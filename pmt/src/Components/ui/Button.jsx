// src/Components/ui/Button.jsx

import React from "react";

const Button = ({ children, onClick, className = "", disabled = false }) => {
  return (
    <button
      className={`px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-300 
                  bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
