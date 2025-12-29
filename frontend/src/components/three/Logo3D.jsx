import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Float, 
  Environment, 
  PerspectiveCamera,
  RoundedBox,
  Sparkles
} from '@react-three/drei';
import * as THREE from 'three';

// Lightning bolt shape for the orbit design
const LightningBolt = ({ position, rotation, scale }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <coneGeometry args={[0.3, 0.8, 4]} />
      <meshStandardMaterial 
        color="#C0C0C0" 
        metalness={0.9} 
        roughness={0.1}
        emissive="#666666"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

// Orbit ring around the logo
const OrbitRing = ({ radius = 2 }) => {
  const ringRef = useRef();
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={ringRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.03, 16, 100]} />
        <meshStandardMaterial 
          color="#888888" 
          metalness={0.8} 
          roughness={0.2}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

// Main 3D Logo Component
const LogoMesh = ({ mousePosition }) => {
  const groupRef = useRef();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useFrame((state) => {
    if (groupRef.current && !prefersReducedMotion) {
      // Smooth rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        state.clock.elapsedTime * 0.1 + mousePosition.x * 0.3,
        0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mousePosition.y * 0.2,
        0.05
      );
      // Gentle bob
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float 
      speed={prefersReducedMotion ? 0 : 1.5} 
      rotationIntensity={prefersReducedMotion ? 0 : 0.2} 
      floatIntensity={prefersReducedMotion ? 0 : 0.3}
    >
      <group ref={groupRef}>
        {/* Glass plaque background */}
        <RoundedBox args={[4, 1.8, 0.3]} radius={0.15} smoothness={4} position={[0, 0, -0.2]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.6}
            roughness={0.1}
            metalness={0}
            thickness={0.5}
            transparent
            opacity={0.3}
          />
        </RoundedBox>

        {/* COR text - Red */}
        <mesh position={[-1.1, 0, 0]}>
          <RoundedBox args={[1.5, 0.8, 0.15]} radius={0.05} smoothness={4}>
            <meshStandardMaterial 
              color="#CC0000" 
              metalness={0.3} 
              roughness={0.4}
              emissive="#990000"
              emissiveIntensity={0.2}
            />
          </RoundedBox>
        </mesh>

        {/* tracker text - Black */}
        <mesh position={[0.9, -0.1, 0]}>
          <RoundedBox args={[1.8, 0.6, 0.12]} radius={0.05} smoothness={4}>
            <meshStandardMaterial 
              color="#1a1a1a" 
              metalness={0.2} 
              roughness={0.5}
            />
          </RoundedBox>
        </mesh>

        {/* Lightning bolt */}
        <LightningBolt 
          position={[-2.2, 0.2, 0.1]} 
          rotation={[0, 0, 0.3]} 
          scale={0.8} 
        />

        {/* Orbit ring */}
        <OrbitRing radius={2.5} />

        {/* Sparkles effect */}
        <Sparkles 
          count={50} 
          scale={5} 
          size={2} 
          speed={0.3} 
          color="#CC0000" 
          opacity={0.5}
        />
      </group>
    </Float>
  );
};

// Scene setup with lights and camera
const Scene = ({ mousePosition }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#CC0000" />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#ffffff" />
      <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={0.5} color="#CC0000" />
      
      <LogoMesh mousePosition={mousePosition} />
      
      <Environment preset="city" />
    </>
  );
};

// Loading fallback
const LoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading 3D Experience...</p>
    </div>
  </div>
);

// Error Boundary for 3D
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center p-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
              alt="CORtracker" 
              className="w-48 mx-auto mb-4 opacity-80"
            />
            <p className="text-gray-600">Experience our interactive demo</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main export component
const Logo3D = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef();

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[500px] md:h-[600px]">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: 'high-performance'
            }}
            style={{ background: 'transparent' }}
          >
            <Scene mousePosition={mousePosition} />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default Logo3D;
