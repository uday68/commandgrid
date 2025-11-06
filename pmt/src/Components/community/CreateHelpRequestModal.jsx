import React, { useState } from 'react';
import { FaTimes, FaCalendarAlt } from 'react-icons/fa';

const CreateHelpRequestModal = ({ show, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [deadline, setDeadline] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    onSubmit({
      title,
      description,
      skills,
      deadline
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setSkills([]);
    setSkillInput('');
    setDeadline('');
  };
  
  const addSkill = () => {
    if (!skillInput.trim()) return;
    if (!skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
    }
    setSkillInput('');
  };
  
  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Create Help Request</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Title*
              </label>
              <input
                type="text"
                placeholder="What do you need help with?"
                className="w-full border rounded-lg px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description*
              </label>
              <textarea
                placeholder="Describe what you need help with in detail"
                className="w-full border rounded-lg px-3 py-2 h-32 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Add skill"
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button 
                  type="button"
                  className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md text-sm"
                  onClick={addSkill}
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 text-blue-800 text-xs py-1 px-2 rounded-full flex items-center"
                  >
                    {skill}
                    <button 
                      type="button"
                      className="ml-1 text-blue-800 hover:text-blue-900"
                      onClick={() => removeSkill(skill)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <FaCalendarAlt className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end p-4 border-t">
            <button 
              type="button"
              className="px-4 py-2 text-gray-700 mr-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateHelpRequestModal;
