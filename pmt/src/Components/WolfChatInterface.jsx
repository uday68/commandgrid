import React, { forwardRef, useRef, useState, useEffect, useContext } from 'react';
import logo from '../assets/animated.png';
import './WolfAnimation.css';
import { AnimationContext } from './AnimationProvider';

const WolfChatInterface = forwardRef(({ onAnimationComplete }, ref) => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState('idle');
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const t = useRef(null);
  const { animationsAvailable, gsap } = useContext(AnimationContext) || { animationsAvailable: false };
  const [useAdvancedEffects, setUseAdvancedEffects] = useState(false);
  const [animationInitialized, setAnimationInitialized] = useState(false);
  const [animationError, setAnimationError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Check for WebGL support on mount and when visibility changes
  useEffect(() => {
    if (visible) {
      try {
        const canvas = document.createElement('canvas');
        let context = null;
        try {
          context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {
          console.warn("WebGL context creation failed:", e);
        }
        
        const hasWebGL = !!window.WebGLRenderingContext && !!context;
        setUseAdvancedEffects(hasWebGL && animationsAvailable && gsap);
        console.log("WebGL available:", hasWebGL && animationsAvailable && gsap);
      } catch (e) {
        console.error("WebGL check error:", e);
        setUseAdvancedEffects(false);
      }
    }
  }, [animationsAvailable, gsap, visible]);

  // Initialize WebGL animation when visible
  useEffect(() => {
    if (!visible || !animationsAvailable || !gsap || !useAdvancedEffects) return;

    let renderer, scene, camera, composer, wolfMesh;
    let animationFrameId;
    let cleanup = null;
    let textureTimeout = null;
    let isComponentMounted = true;
    let resizeTimeout;
    
    const initAnimation = async () => {
      try {
        let THREE;
        try {
          THREE = await import('three').catch(err => {
            throw new Error(`Failed to load THREE.js: ${err.message}`);
          });
        } catch (err) {
          console.error("THREE.js import error:", err);
          handleAnimationError("Failed to load 3D library", true);
          return;
        }
        
        let EffectComposer, RenderPass, ShaderPass;
        try {
          const modules = await Promise.all([
            import('three/examples/jsm/postprocessing/EffectComposer').catch(e => null),
            import('three/examples/jsm/postprocessing/RenderPass').catch(e => null),
            import('three/examples/jsm/postprocessing/ShaderPass').catch(e => null)
          ]);
          
          if (!modules[0] || !modules[1] || !modules[2]) {
            throw new Error("One or more required modules failed to load");
          }
          
          EffectComposer = modules[0].EffectComposer;
          RenderPass = modules[1].RenderPass;
          ShaderPass = modules[2].ShaderPass;
        } catch (err) {
          console.error("Failed to import THREE.js modules:", err);
          handleAnimationError("Failed to load 3D effects", true);
          return;
        }
        
        if (!isComponentMounted) return;
        
        try {
          scene = new THREE.Scene();
          camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: true
          });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setClearColor(0x000000, 0);
        } catch (err) {
          console.error("Scene setup error:", err);
          handleAnimationError("Failed to create 3D scene", false);
          return;
        }
        
        if (canvasRef.current && isComponentMounted) {
          try {
            canvasRef.current.appendChild(renderer.domElement);
          } catch (err) {
            console.error("Failed to append renderer to DOM:", err);
            handleAnimationError("Failed to initialize display", false);
            return;
          }
        } else {
          throw new Error("Canvas reference not available");
        }
        
        camera.position.z = 5;
        
        try {
          composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
          
          const eyePosition = new THREE.Vector2(0.46, 0.38);
          
          const edgeShaderUniforms = {
            tDiffuse: { value: null },
            time: { value: 0 },
            progress: { value: 0 },
            eyePosition: { value: eyePosition },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
          };
          
          const edgePass = new ShaderPass({
            uniforms: edgeShaderUniforms,
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform sampler2D tDiffuse;
              uniform float time;
              uniform float progress;
              uniform vec2 eyePosition;
              uniform vec2 resolution;
              varying vec2 vUv;
              
              #define EDGE_THRESHOLD 0.15
              #define GLOW_INTENSITY 2.5
              
              float edgeDetection(vec2 uv) {
                vec2 texel = 1.0 / resolution;
                
                float leftTop = length(texture2D(tDiffuse, uv + texel * vec2(-1, -1)).rgb);
                float centerTop = length(texture2D(tDiffuse, uv + texel * vec2(0, -1)).rgb);
                float rightTop = length(texture2D(tDiffuse, uv + texel * vec2(1, -1)).rgb);
                float leftCenter = length(texture2D(tDiffuse, uv + texel * vec2(-1, 0)).rgb);
                float rightCenter = length(texture2D(tDiffuse, uv + texel * vec2(1, 0)).rgb);
                float leftBottom = length(texture2D(tDiffuse, uv + texel * vec2(-1, 1)).rgb);
                float centerBottom = length(texture2D(tDiffuse, uv + texel * vec2(0, 1)).rgb);
                float rightBottom = length(texture2D(tDiffuse, uv + texel * vec2(1, 1)).rgb);
                
                float gx = leftTop + 2.0 * leftCenter + leftBottom - rightTop - 2.0 * rightCenter - rightBottom;
                float gy = leftTop + 2.0 * centerTop + rightTop - leftBottom - 2.0 * centerBottom - rightBottom;
                
                return clamp(sqrt(gx * gx + gy * gy), 0.0, 1.0);
              }
              
              void main() {
                vec4 texColor = texture2D(tDiffuse, vUv);
                
                float edge = edgeDetection(vUv);
                float mask = smoothstep(0.0, progress, edge);
                
                vec3 edgeColor = mix(
                  vec3(1.0, 0.2, 0.1),
                  vec3(0.1, 0.4, 1.0),
                  sin(time * 1.5) * 0.5 + 0.5
                );
                
                float eyeDist = distance(vUv, eyePosition);
                vec3 eyeGlow = vec3(1.0, 0.0, 0.0) * smoothstep(0.12, 0.04, eyeDist) * 
                               (sin(time * 3.0) * 0.5 + 1.5) * progress * GLOW_INTENSITY;
                
                float sweep = smoothstep(0.1, 0.0, 
                  abs(mod(vUv.x + vUv.y - time * 0.2, 2.0) - 1.0)) * 0.15 * progress;
                
                vec3 finalColor = texColor.rgb + (edge * mask * edgeColor) + eyeGlow + sweep;
                
                gl_FragColor = vec4(finalColor, texColor.a);
              }
            `
          });
          
          try {
            composer.addPass(edgePass);
          } catch (err) {
            console.error("Error adding shader pass:", err);
            handleAnimationError("Shader initialization failed", false);
          }
        } catch (err) {
          console.error("Post-processing setup error:", err);
        }
        
        textureTimeout = setTimeout(() => {
          if (isComponentMounted) {
            if (retryCount < maxRetries) {
              console.warn(`Texture loading timed out, retrying (${retryCount + 1}/${maxRetries})...`);
              setRetryCount(prev => prev + 1);
            } else {
              handleAnimationError("Texture loading timed out", true);
            }
          }
        }, 5000);
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          logo,
          texture => {
            if (!isComponentMounted) return;
            
            if (textureTimeout) {
              clearTimeout(textureTimeout);
              textureTimeout = null;
            }
            
            try {
              const aspectRatio = texture.image.width / texture.image.height;
              const geometry = new THREE.PlaneGeometry(4 * aspectRatio, 4);
              const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9
              });
              
              wolfMesh = new THREE.Mesh(geometry, material);
              scene.add(wolfMesh);
              
              if (composer && composer.passes && composer.passes.length > 1) {
                const edgePass = composer.passes[1];
                if (edgePass && edgePass.uniforms && edgePass.uniforms.progress && gsap) {
                  gsap.to(edgePass.uniforms.progress, {
                    value: 1,
                    duration: 1.8,
                    ease: "power2.out"
                  });
                }
              }
              setAnimationInitialized(true);
            } catch (err) {
              console.error("Error creating mesh:", err);
              handleAnimationError("Failed to create 3D model", false);
            }
          },
          undefined,
          error => {
            if (!isComponentMounted) return;
            
            console.error('Error loading texture:', error);
            handleAnimationError('Failed to load texture', false);
            
            if (textureTimeout) {
              clearTimeout(textureTimeout);
              textureTimeout = null;
            }
          }
        );
        
        const handleResize = () => {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          
          resizeTimeout = setTimeout(() => {
            if (!isComponentMounted) return;
            
            if (camera && renderer && composer) {
              try {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                composer.setSize(window.innerWidth, window.innerHeight);
                
                if (composer.passes) {
                  composer.passes.forEach(pass => {
                    if (pass.uniforms && pass.uniforms.resolution) {
                      pass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
                    }
                  });
                }
              } catch (err) {
                console.error("Resize handler error:", err);
              }
            }
          }, 250);
        };
        
        window.addEventListener('resize', handleResize);
        
        const animate = () => {
          if (!isComponentMounted) return;
          
          animationFrameId = requestAnimationFrame(animate);
          
          try {
            if (composer && composer.passes) {
              composer.passes.forEach(pass => {
                if (pass.uniforms && pass.uniforms.time) {
                  pass.uniforms.time.value = performance.now() / 1000;
                }
              });
            }
            
            if (composer) {
              composer.render();
            } else if (renderer && scene && camera) {
              renderer.render(scene, camera);
            }
          } catch (err) {
            console.error("Animation frame error:", err);
            cancelAnimationFrame(animationFrameId);
            handleAnimationError("Animation rendering failed", false);
          }
        };
        
        animate();
        
        cleanup = () => {
          isComponentMounted = false;
          
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
          
          if (resizeTimeout) clearTimeout(resizeTimeout);
          window.removeEventListener('resize', handleResize);
          
          if (canvasRef.current && renderer && renderer.domElement) {
            try {
              canvasRef.current.removeChild(renderer.domElement);
            } catch (e) {
              console.warn("WebGL cleanup error:", e);
            }
          }
          
          if (wolfMesh) {
            if (wolfMesh.geometry) wolfMesh.geometry.dispose();
            if (wolfMesh.material) {
              if (wolfMesh.material.map) wolfMesh.material.map.dispose();
              wolfMesh.material.dispose();
            }
          }
          
          if (composer) {
            composer.passes.forEach(pass => {
              if (pass.dispose) pass.dispose();
            });
            composer = null;
          }
          
          if (renderer) {
            renderer.forceContextLoss();
            renderer.dispose();
            renderer = null;
          }
          
          if (textureTimeout) {
            clearTimeout(textureTimeout);
            textureTimeout = null;
          }
          
          scene = null;
          camera = null;
        };
      } catch (err) {
        console.error("WebGL animation failed:", err);
        handleAnimationError('WebGL animation initialization failed: ' + err.message, true);
      }
    };
    
    function handleAnimationError(message, fallback) {
      if (!isComponentMounted) return;
      
      console.error(message);
      setAnimationError(message);
      
      if (fallback) {
        setUseAdvancedEffects(false);
      }
    }
    
    initAnimation();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      if (textureTimeout) {
        clearTimeout(textureTimeout);
        textureTimeout = null;
      }
      setAnimationInitialized(false);
    };
  }, [visible, animationsAvailable, gsap, useAdvancedEffects, retryCount]);

  React.useImperativeHandle(ref, () => ({
    activateLogo: () => {
      clearAll();
      setVisible(true);
      setAnimationError(null);
      setRetryCount(0);
      setPhase('rotate');
      
      try {
        const canvas = document.createElement('canvas');
        let context = null;
        try {
          context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {
          console.warn("WebGL context creation failed:", e);
        }
        
        const hasWebGL = !!window.WebGLRenderingContext && !!context;
        setUseAdvancedEffects(hasWebGL && animationsAvailable && gsap);
      } catch (e) {
        console.error("WebGL activation error:", e);
        setUseAdvancedEffects(false);
      }
      
      const timeouts = [];
      timeouts.push(window.setTimeout(() => setPhase('highlight'), 1400));
      timeouts.push(window.setTimeout(() => setPhase('scale'),    1800));
      timeouts.push(window.setTimeout(() => setPhase('eye'),      2600));
      timeouts.push(window.setTimeout(() => setPhase('exit'),     4000));
      timeouts.push(window.setTimeout(() => {
        setVisible(false);
        setPhase('idle');
        onAnimationComplete?.();
      }, 4500));
      
      t.current = timeouts;
    }
  }));

  function clearAll() {
    if (t.current) {
      if (Array.isArray(t.current)) {
        t.current.forEach(timeout => window.clearTimeout(timeout));
      } else {
        window.clearTimeout(t.current);
      }
      t.current = null;
    }
  }

  useEffect(() => {
    return () => clearAll();
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="wolf-overlay" />
      <div className={`wolf-container ${phase}`} ref={containerRef}>
        <div className="wolf-image" ref={canvasRef}>
          {(!useAdvancedEffects || animationError || !animationInitialized) && (
            <img src={logo} alt="Wolf Logo" />
          )}
        </div>
        <div className={`wolf-eye ${phase==='eye' ? 'active' : ''}`} />
        <div className={`light-sweep ${phase!=='idle' ? 'active' : ''}`} />
        {animationError && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'red', fontSize: '10px' }}>
            {animationError}
          </div>
        )}
      </div>
    </>
  );
});

WolfChatInterface.displayName = 'WolfChatInterface';
export default WolfChatInterface;
