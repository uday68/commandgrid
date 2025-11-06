/**
 * Utility to check component validity
 * Helps diagnose "is not a function" type errors
 */

export const isValidComponent = (component) => {
  if (!component) return false;
  
  // Check if it's a valid React component
  if (typeof component === 'function') return true;
  
  // Check if it's a valid React component (class)
  if (typeof component === 'object' && 
      component.$$typeof && 
      (component.$$typeof.toString() === 'Symbol(react.forward_ref)' || 
       component.$$typeof.toString() === 'Symbol(react.memo)')) {
    return true;
  }

  console.error('Invalid component:', component);
  return false;
};
