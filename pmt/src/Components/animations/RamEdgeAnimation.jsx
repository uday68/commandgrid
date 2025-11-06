import { useEffect, useRef, useState, useContext } from 'react';
import { AnimationContext } from '../AnimationProvider';
import AnimationFallback from './AnimationFallback';
// Import the image directly using the absolute path
import ramImage from '../../assets/image.png';

const RamEdgeAnimation = () => {
  const mountRef = useRef(null);
  const { animationsAvailable, error, gsap } = useContext(AnimationContext);
  const [animationError, setAnimationError] = useState(null);
  
  useEffect(() => {
    // Don't proceed if animations aren't available
    if (!animationsAvailable || !gsap) {
      return;
    }
    
    let scene, camera, renderer, lightTrail;
    let cleanup = null;
    
    const initAnimation = async () => {
      try {
        // Dynamically import THREE.js to prevent build errors if not available
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls');
        const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer');
        const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass');
        const { ShaderPass } = await import('three/examples/jsm/postprocessing/ShaderPass');
        const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass');
        
        // Animation setup code (existing implementation)
        const eyePosition = new THREE.Vector2(0.62, 0.42); // Normalized coordinates
        
        let composer, ramMesh, edgePass;
        let animationFrameId;

        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current?.appendChild(renderer.domElement);

        // Post-processing setup
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        // Custom edge detection + light trail shader
        edgePass = new ShaderPass({
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

            #define EDGE_THRESHOLD 0.1
            #define LIGHT_WIDTH 0.005
            #define LIGHT_SPEED 2.0

            float edgeDetection(vec2 uv) {
              vec2 texel = 1.0 / resolution;
              float kernel[9];
              kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
              kernel[3] = -1.0; kernel[4] =  8.0; kernel[5] = -1.0;
              kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;

              float edge = 0.0;
              int index = 0;
              for(int y = -1; y <= 1; y++) {
                for(int x = -1; x <= 1; x++) {
                  vec4 color = texture2D(tDiffuse, uv + vec2(x, y) * texel);
                  edge += color.r * kernel[index++];
                }
              }
              return clamp(edge, 0.0, 1.0);
            }

            void main() {
              // Initial black screen
              if(progress == 0.0) {
                gl_FragColor = vec4(0.0);
                return;
              }

              // Edge detection
              float edge = edgeDetection(vUv);
              
              // Radial progress mask
              vec2 center = vec2(0.5);
              float dist = distance(vUv, center);
              float visible = smoothstep(progress - 0.1, progress, dist);

              // Light trail animation
              float angle = atan(vUv.y - center.y, vUv.x - center.x);
              float lightPos = mod(time * LIGHT_SPEED, 6.283);
              float lightDist = abs(angle - lightPos);
              
              // Combine effects
              vec3 color = vec3(0.0);
              
              // Edge glow
              if(edge > EDGE_THRESHOLD && visible > 0.5) {
                color += vec3(1.0) * smoothstep(0.3, 0.1, lightDist) * 
                        (sin(time * 5.0) * 0.5 + 0.5);
              }

              // Eye glow at completion
              if(progress >= 1.0) {
                float eyeDist = distance(vUv, eyePosition);
                color += vec3(0.0, 0.0, 0.0) * smoothstep(0.1, 0.05, eyeDist) * 
                         (sin(time * 3.0) * 0.5 + 0.5);
              }

              gl_FragColor = vec4(color, 1.0);
            }
          `
        });

        composer.addPass(edgePass);

        try {
          // Load RAM texture using the imported image
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
            ramImage,
            texture => {
              const geometry = new THREE.PlaneGeometry(4, 4);
              const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0
              });

              ramMesh = new THREE.Mesh(geometry, material);
              scene.add(ramMesh);

              // Animation timeline - check if a valid target exists before animating
              if (edgePass && edgePass.uniforms && edgePass.uniforms.progress) {
                gsap.to(edgePass.uniforms.progress, {
                  value: 1,
                  duration: 4,
                  ease: "power2.out",
                  onUpdate: () => {
                    if (ramMesh && ramMesh.material && edgePass.uniforms.progress.value >= 0.99) {
                      gsap.to(ramMesh.material, { opacity: 1, duration: 1 });
                    }
                  }
                });
              }
            },
            undefined, // onProgress callback not needed
            error => {
              console.error('Error loading texture:', error);
              setAnimationError('Failed to load RAM image');
            }
          );

          // Add window resize handler
          const handleResize = () => {
            if (camera && renderer && composer && edgePass) {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
              composer.setSize(window.innerWidth, window.innerHeight);
              if (edgePass.uniforms && edgePass.uniforms.resolution) {
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

          // Cleanup
          cleanup = () => {
            cancelAnimationFrame(animationFrameId);
            if (mountRef.current && renderer.domElement) {
              mountRef.current.removeChild(renderer.domElement);
            }
            window.removeEventListener('resize', handleResize);

            // Dispose resources
            if (ramMesh) {
              ramMesh.geometry.dispose();
              ramMesh.material.dispose();
            }
            if (renderer) renderer.dispose();
          };
        } catch (err) {
          console.error('Error in RamEdgeAnimation:', err);
          setAnimationError(`Animation error: ${err.message}`);
        }
      } catch (err) {
        console.error("Failed to initialize animation:", err);
        setAnimationError(err);
      }
    };
    
    initAnimation();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [animationsAvailable, gsap]);

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
    <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }} />
  );
};

export default RamEdgeAnimation;