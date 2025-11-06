import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WolfAnimation from './WolfAnimation';

const PostWolfAnimation = ({ redirectTo = "/dashboard", duration = 7000 }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  const navigate = useNavigate();

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    // Navigate after animation completes
    setTimeout(() => {
      navigate(redirectTo);
    }, 600); // Short delay after animation completes
  };

  return !animationComplete ? <WolfAnimation onAnimationComplete={handleAnimationComplete} /> : null;
};

export default PostWolfAnimation;
