import React, { useEffect, useRef, useState, useContext } from 'react';
import { AnimationContext } from '../AnimationProvider';
import AnimationFallback from './AnimationFallback';
import wolfImage from '../../assets/wolf.png'; // Make sure to place your wolf image here
import '../WolfAnimation.css';

const WolfAnimation = ({ onAnimationComplete }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { animationsAvailable, error, gsap } = useContext(AnimationContext);
  const [animationError, setAnimationError] = useState(null);
  
  useEffect(() => {
    if (!animationsAvailable || !gsap) {
      return;
    }
    
    let renderer, scene, camera, composer, wolfMesh;
    let animationFrameId;
    let cleanup = null;
    
    const initAnimation = async () => {
      try {
        // Dynamically import THREE.js
        const THREE = await import('three');
        const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer');
        const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass');
        const { ShaderPass } = await import('three/examples/jsm/postprocessing/ShaderPass');
        
        // Setup scene
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        canvasRef.current?.appendChild(renderer.domElement);
        
        camera.position.z = 5;
        
        // Post-processing setup
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        
        // Eye position (adjust based on your wolf image)
        const eyePosition = new THREE.Vector2(0.46, 0.38);
        
        // Canny Edge Detection Pass
        const edgePass = new ShaderPass({
          uniforms: {
            tDiffuse: { value: null },
            time: { value: 0 },
            progress: { value: 0 },
            eyePosition: { value: eyePosition },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
          },
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
              
              // Sobel operator
              float leftTop = length(texture2D(tDiffuse, uv + texel * vec2(-1, -1)).rgb);
              float centerTop = length(texture2D(tDiffuse, uv + texel * vec2(0, -1)).rgb);
              float rightTop = length(texture2D(tDiffuse, uv + texel * vec2(1, -1)).rgb);
              float leftCenter = length(texture2D(tDiffuse, uv + texel * vec2(-1, 0)).rgb);
              float rightCenter = length(texture2D(tDiffuse, uv + texel * vec2(1, 0)).rgb);
              float leftBottom = length(texture2D(tDiffuse, uv + texel * vec2(-1, 1)).rgb);
              float centerBottom = length(texture2D(tDiffuse, uv + texel * vec2(0, 1)).rgb);
              float rightBottom = length(texture2D(tDiffuse, uv + texel * vec2(1, 1)).rgb);
              
              // Gradient approximation
              float gx = leftTop + 2.0 * leftCenter + leftBottom - rightTop - 2.0 * rightCenter - rightBottom;
              float gy = leftTop + 2.0 * centerTop + rightTop - leftBottom - 2.0 * centerBottom - rightBottom;
              
              return clamp(sqrt(gx * gx + gy * gy), 0.0, 1.0);
            }
            
            void main() {
              vec4 texColor = texture2D(tDiffuse, vUv);
              
              // Edge detection with progress mask
              float edge = edgeDetection(vUv);
              float mask = smoothstep(0.0, progress, edge);
              
              // AI-style color glow (red base with cybernetic blue accents)
              vec3 edgeColor = mix(
                vec3(1.0, 0.2, 0.1), // Red glow
                vec3(0.1, 0.4, 1.0), // Blue accent
                sin(time * 1.5) * 0.5 + 0.5
              );
              
              // Eye glow effect
              float eyeDist = distance(vUv, eyePosition);
              vec3 eyeGlow = vec3(1.0, 0.0, 0.0) * smoothstep(0.12, 0.04, eyeDist) * 
                             (sin(time * 3.0) * 0.5 + 1.5) * progress * GLOW_INTENSITY;
              
              // Light sweep effect
              float sweep = smoothstep(0.1, 0.0, 
                abs(mod(vUv.x + vUv.y - time * 0.2, 2.0) - 1.0)) * 0.15 * progress;
              
              // Combine effects
              vec3 finalColor = texColor.rgb + (edge * mask * edgeColor) + eyeGlow + sweep;
              
              gl_FragColor = vec4(finalColor, texColor.a);
            }
          `
        });
        
        composer.addPass(edgePass);
        
        // Load wolf texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          wolfImage,
          texture => {
            const aspectRatio = texture.image.width / texture.image.height;
            const geometry = new THREE.PlaneGeometry(4 * aspectRatio, 4);
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0
            });
            
            wolfMesh = new THREE.Mesh(geometry, material);
            scene.add(wolfMesh);
            
            // Animation timeline
            const timeline = gsap.timeline({
              onComplete: () => {
                // Add DOM classes for additional animations
                if (containerRef.current) {
                  // Initial rotate-in animation
                  containerRef.current.classList.add('rotate');
                  
                  setTimeout(() => {
                    containerRef.current.classList.add('highlight');
                    
                    setTimeout(() => {
                      // Eye glow effect
                      const eyeElement = document.querySelector('.wolf-eye');
                      if (eyeElement) eyeElement.classList.add('active');
                      
                      // Light sweep effect
                      const sweepElement = document.querySelector('.light-sweep');
                      if (sweepElement) sweepElement.classList.add('active');
                      
                      setTimeout(() => {
                        // Final scale animation
                        containerRef.current.classList.add('scale');
                        
                        // Exit animation
                        setTimeout(() => {
                          containerRef.current.classList.add('exit');
                          
                          // Complete the animation
                          setTimeout(() => {
                            if (typeof onAnimationComplete === 'function') {
                              onAnimationComplete();
                            }
                          }, 600);
                        }, 1800);
                      }, 700);
                    }, 1500);
                  }, 1400);
                }
              }
            });
            
            // Fade in wolf texture
            timeline.to(material, { opacity: 1, duration: 1, ease: "power2.out" });
            
            // Animate edge detection progress
            if (edgePass && edgePass.uniforms && edgePass.uniforms.progress) {
              timeline.to(edgePass.uniforms.progress, {
                value: 1,
                duration: 3,
                ease: "power2.out"
              }, "-=0.5");
            }
          },
          undefined,
          error => {
            console.error('Error loading texture:', error);
            setAnimationError('Failed to load wolf image');
          }
        );
        
        // Resize handler
        const handleResize = () => {
          if (camera && renderer && composer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
            
            if (edgePass && edgePass.uniforms && edgePass.uniforms.resolution) {
              edgePass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            }
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Animation loop
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          if (edgePass && edgePass.uniforms && edgePass.uniforms.time) {
            edgePass.uniforms.time.value = performance.now() / 1000;
          }
          if (composer) {
            composer.render();
          }
        };
        animate();
        
        // Cleanup function
        cleanup = () => {
          cancelAnimationFrame(animationFrameId);
          if (canvasRef.current && renderer.domElement) {
            canvasRef.current.removeChild(renderer.domElement);
          }
          window.removeEventListener('resize', handleResize);
          
          // Dispose resources
          if (wolfMesh) {
            wolfMesh.geometry.dispose();
            wolfMesh.material.dispose();
          }
          if (renderer) renderer.dispose();
        };
        
      } catch (err) {
        console.error("Failed to initialize animation:", err);
        setAnimationError(err.message || "Unknown error initializing animation");
      }
    };
    
    initAnimation();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [animationsAvailable, gsap, onAnimationComplete]);
  
  // Show fallback if animations aren't available
  if (animationError || error || !animationsAvailable) {
    return (
      <AnimationFallback 
        error={animationError || error} 
        height="100vh"
      />
    );
  }
  
  return (
    <>
      <div className="wolf-overlay"></div>
      <div className="wolf-container" ref={containerRef}>
        <div className="wolf-image" ref={canvasRef}></div>
        <div className="wolf-eye"></div>
        <div className="light-sweep"></div>
      </div>
    </>
  );
};

export default WolfAnimation;
