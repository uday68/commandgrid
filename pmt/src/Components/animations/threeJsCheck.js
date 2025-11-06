import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// Export all THREE.js libraries
export const ThreeLibs = {
  THREE,
  OrbitControls,
  EffectComposer,
  RenderPass,
  ShaderPass,
  UnrealBloomPass
};

// Check if THREE.js libraries are available
export const checkThreeJsAvailability = () => {
  const requiredLibs = ['THREE', 'OrbitControls', 'EffectComposer', 'RenderPass', 'ShaderPass', 'UnrealBloomPass'];
  const missing = [];
  
  if (!THREE) missing.push('THREE');
  if (!OrbitControls) missing.push('OrbitControls');
  if (!EffectComposer) missing.push('EffectComposer');
  if (!RenderPass) missing.push('RenderPass');
  if (!ShaderPass) missing.push('ShaderPass');
  if (!UnrealBloomPass) missing.push('UnrealBloomPass');
  
  const isAvailable = missing.length === 0;
  
  if (!isAvailable) {
    console.warn('❌ Some THREE.js libraries are missing:', missing);
    console.warn({ isAvailable, missing });
  } else {
    console.log('✅ All THREE.js libraries are available');
  }
  
  return { isAvailable, missing };
};

export default ThreeLibs;
