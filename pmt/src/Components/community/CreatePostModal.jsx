import React, { useState } from 'react';
import { FaTimes, FaImage, FaCode, FaPoll } from 'react-icons/fa';

const CreatePostModal = ({ show, onClose, onSubmit }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    onSubmit({
      title,
      content,
      tags
    });
    
    // Reset form
    setContent('');
    setTitle('');
    setTags([]);
    setTagInput('');
  };
  
  const addTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
    }
    setTagInput('');
  };
  
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Create Post</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <input
              type="text"
              placeholder="Title (optional)"
              className="w-full border rounded-lg px-3 py-2 mb-4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <textarea
              placeholder="What's on your mind?"
              className="w-full border rounded-lg px-3 py-2 h-40 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
            
            <div className="flex mt-3">
              <button type="button" className="mr-3 flex items-center text-gray-500 hover:text-blue-500">
                <FaImage className="mr-1" /> Add Image
              </button>
              <button type="button" className="mr-3 flex items-center text-gray-500 hover:text-blue-500">
                <FaCode className="mr-1" /> Add Code
              </button>
              <button type="button" className="flex items-center text-gray-500 hover:text-blue-500">
                <FaPoll className="mr-1" /> Add Poll
              </button>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Add tag"
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button 
                  type="button"
                  className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md text-sm"
                  onClick={addTag}
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 text-blue-800 text-xs py-1 px-2 rounded-full flex items-center"
                  >
                    {tag}
                    <button 
                      type="button"
                      className="ml-1 text-blue-800 hover:text-blue-900"
                      onClick={() => removeTag(tag)}
                    >
                      &times;
                    </button>
                  </span>
                ))}
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
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
