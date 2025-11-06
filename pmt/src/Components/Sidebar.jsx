import React from "react";
import { NavLink } from "react-router-dom";
import { FiFolder, FiCheckCircle, FiUsers, FiFileText, FiMessageSquare } from "react-icons/fi";

const Sidebar = ({ links }) => {
  return (
    <div className="w-64 bg-white shadow-lg p-5 flex flex-col h-screen">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Project Manager</h2>
      <nav className="space-y-3 flex-1">
        {links.map((link,index) => (
          <NavLink
            key={index}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center p-2 rounded transition ${
                isActive ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-200"
              }`
            }
          >
            {link.icon && <link.icon className="mr-2" />}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
