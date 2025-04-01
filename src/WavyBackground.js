import React, { useEffect, useRef } from "react";
import "./WavyBackground.css";

const WavyBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set canvas dimensions to match window
    canvas.width = width;
    canvas.height = height;

    // Updated wave properties with new colors and dynamics
    const waves = [
      {
        amplitude: 35,
        frequency: 0.015,
        speed: 0.04,
        color: "rgba(0, 149, 237, 0.25)", // Bright blue
        phase: 0,
      },
      {
        amplitude: 25,
        frequency: 0.03,
        speed: 0.06,
        color: "rgba(64, 224, 208, 0.2)", // Turquoise
        phase: Math.PI / 3,
      },
      {
        amplitude: 40,
        frequency: 0.02,
        speed: 0.03,
        color: "rgba(0, 191, 255, 0.18)", // Deep sky blue
        phase: Math.PI / 1.5,
      },
      {
        amplitude: 20,
        frequency: 0.04,
        speed: 0.07,
        color: "rgba(32, 178, 170, 0.15)", // Light sea green
        phase: Math.PI,
      },
    ];

    // Animation function with improved wave rendering
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw waves from bottom to top
      waves.forEach((wave) => {
        ctx.fillStyle = wave.color;
        ctx.beginPath();
        ctx.moveTo(0, height);

        // Draw wave path with smoother interpolation
        for (let x = 0; x <= width; x += 3) {
          // More points for smoother curves
          // Modified wave equation for more natural appearance
          const y =
            height -
            height / 3.5 - // Adjusted starting position
            wave.amplitude *
              Math.sin(wave.phase + wave.frequency * x) *
              (1 + 0.1 * Math.sin((x / width) * Math.PI)); // Add subtle variation

          ctx.lineTo(x, y);
        }

        // Complete the path
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Update phase for animation
        wave.phase += wave.speed;
      });

      requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="wavy-background" />;
};

export default WavyBackground;
