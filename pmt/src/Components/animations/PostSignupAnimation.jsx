import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RamEdgeAnimation from './RamEdgeAnimation';

const PostSignupAnimation = ({ redirectTo = "/dashboard" }) => {
  const [showAnimation, setShowAnimation] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Display animation for exactly 3 seconds, then redirect
    const timer = setTimeout(() => {
      setShowAnimation(false);
      navigate(redirectTo);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, redirectTo]);

  return showAnimation ? <RamEdgeAnimation /> : null;
};

export default PostSignupAnimation;
