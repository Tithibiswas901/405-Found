import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const ThreeBot = ({ messages, theme }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const wavesRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const mousePositionRef = useRef({ x: 0, y: 0 });

  // Create wave state for animations
  const [waveIntensity, setWaveIntensity] = useState(1);
  const [waveSpeed, setWaveSpeed] = useState(1);

  // Setup scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set background based on theme
    const bgColor = theme === "dark" ? 0x0a0a0f : 0xf0f0ff;
    scene.background = new THREE.Color(bgColor);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    camera.position.y = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Create the wavy background
    createWavyBackground(scene, theme);

    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = clockRef.current.getElapsedTime() * waveSpeed;

      // Animate the waves if they exist
      if (wavesRef.current) {
        const positions = wavesRef.current.geometry.attributes.position;
        const count = positions.count;

        for (let i = 0; i < count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);

          // Create wave motion
          const mouseEffect = mousePositionRef.current.x * 0.05;
          const waveHeight =
            Math.sin(x / 2 + time) * Math.cos(y / 2 + time) * waveIntensity;

          // Apply height to z-coordinate
          positions.setZ(i, waveHeight);
        }

        positions.needsUpdate = true;

        // Subtle rotation for more dynamic effect
        wavesRef.current.rotation.z = Math.sin(time * 0.1) * 0.1;
      }

      // Render
      rendererRef.current.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      // Dispose resources
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [theme, waveIntensity, waveSpeed]);

  // Function to create wavy background
  const createWavyBackground = (scene, theme) => {
    // Create a plane geometry with high segment count for smooth waves
    const geometry = new THREE.PlaneGeometry(50, 30, 64, 64);

    // Choose color based on theme
    const primaryColor = theme === "dark" ? 0x6b48ff : 0x9969ff;
    const secondaryColor = theme === "dark" ? 0xff4d8f : 0xff3366;

    // Create shader material for more advanced wave effects
    const material = new THREE.MeshPhongMaterial({
      color: primaryColor,
      specular: secondaryColor,
      shininess: 60,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      wireframe: false,
    });

    const waves = new THREE.Mesh(geometry, material);

    // Position the wave plane
    waves.position.set(0, 0, -10);
    waves.rotation.x = Math.PI / 3;

    scene.add(waves);
    wavesRef.current = waves;
  };

  // Handle mouse movement to affect waves
  useEffect(() => {
    const handleMouseMove = (event) => {
      mousePositionRef.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };

      // Increase wave intensity slightly when mouse moves
      setWaveIntensity((prev) => Math.min(prev + 0.01, 1.5));

      // Reset wave intensity after delay
      clearTimeout(mousePositionRef.current.timeout);
      mousePositionRef.current.timeout = setTimeout(() => {
        setWaveIntensity(1);
      }, 1000);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // React to messages - change wave patterns
  useEffect(() => {
    if (!messages.length) return;

    // Only react to most recent message
    const latestMessage = messages[messages.length - 1];
    const content = latestMessage.content.toLowerCase();

    // Analyze content to determine wave behavior
    if (latestMessage.role === "user") {
      // User messages - increase activity
      setWaveSpeed(1.5);
      setWaveIntensity(1.2);

      if (content.includes("?")) {
        // Questions make waves more active
        setWaveSpeed(1.8);
        setWaveIntensity(1.4);
      } else if (content.includes("!")) {
        // Exclamations create more dramatic waves
        setWaveSpeed(2.0);
        setWaveIntensity(1.6);
      }
    } else {
      // AI responses - calmer waves
      setWaveSpeed(1.0);
      setWaveIntensity(1.0);

      if (content.includes("sorry") || content.includes("error")) {
        // Error messages - slower, lower waves
        setWaveSpeed(0.7);
        setWaveIntensity(0.7);
      } else if (content.includes("happy") || content.includes("great")) {
        // Positive messages - more lively waves
        setWaveSpeed(1.3);
        setWaveIntensity(1.3);
      }
    }

    // Reset to default state after 5 seconds
    const timer = setTimeout(() => {
      setWaveSpeed(1.0);
      setWaveIntensity(1.0);
    }, 5000);

    return () => clearTimeout(timer);
  }, [messages]);

  return <div ref={mountRef} className="three-bot-container" />;
};

export default ThreeBot;
