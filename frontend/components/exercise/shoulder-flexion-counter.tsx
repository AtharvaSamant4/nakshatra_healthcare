"use client";

import React, { useEffect, useRef, useState } from "react";
import { useShoulderFlexionCounter, Landmark } from "@/hooks/use-shoulder-flexion-counter";
// IMPORTANT: You would need to install standard mediapipe libs:
// npm install @mediapipe/pose @mediapipe/camera_utils
// import { Pose } from "@mediapipe/pose";
// import { Camera } from "@mediapipe/camera_utils";

export default function ShoulderFlexionGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // 12. React Integration
  const { output, processFrame } = useShoulderFlexionCounter();

  useEffect(() => {
    let camera: any = null; // Mock camera util
    let poseDetector: any = null; // Mock Pose instance

    if (isCameraActive && videoRef.current) {
      /*
      // REAL MEDIAPIPE IMPLEMENTATION:
      
      poseDetector = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseDetector.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseDetector.onResults((results) => {
        if (results.poseLandmarks) {
          // Send 33 3D landmarks to our custom logic hook inside the requestAnimationFrame loop
          processFrame(results.poseLandmarks);
          
          // Optional: draw landmarks here on canvasRef
        }
      });

      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await poseDetector.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      */

      // -- MOCK LOCAL SCRIPT FOR DEMO (simulate camera frames) --
      const simulateFrames = setInterval(() => {
        // mock changing angles
        const time = Date.now() / 1000;
        // Simulates arm raising and lowering between ~20 and ~170 degrees over time using sine wave
        const simulatedAngle = 90 + 80 * Math.sin(time * 2); 
        
        // Construct mock landmarks for Shoulder, Elbow, Hip
        processFrame([
           // Filling up array to hit indices: 12 (Shoulder), 14 (Elbow), 24 (Hip)
           ...Array(12).fill({x:0, y:0}),
           { x: 0.5, y: 0.3, visibility: 0.99 }, // 12 - Right Shoulder
           { x: 0, y: 0 }, // 13
           // Elbow rotates around shoulder to simulate changing angle
           { x: 0.5 + Math.cos(simulatedAngle * (Math.PI/180)) * 0.2, y: 0.3 - Math.sin(simulatedAngle * (Math.PI/180)) * 0.2, visibility: 0.99 }, // 14 - Right Elbow
           ...Array(9).fill({x:0, y:0}),
           { x: 0.5, y: 0.7, visibility: 0.99 }, // 24 - Hip (downwards)
        ] as Landmark[]);
      }, 33); // ~30 fps

      return () => clearInterval(simulateFrames);
    }

    return () => {
      // if (camera) camera.stop();
      // if (poseDetector) poseDetector.close();
    };
  }, [isCameraActive, processFrame]);

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <h1 className="text-2xl font-bold">Shoulder Flexion Trainer</h1>
      
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ width: 640, height: 480 }}>
        {/* Real video feed would go here */}
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/60 z-10">
            <button 
              className="bg-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              onClick={() => setIsCameraActive(true)}
            >
              Start Camera & Tracking
            </button>
          </div>
        )}
      </div>

      {/* 11. Output Values Display */}
      {isCameraActive && (
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
          <div className="bg-slate-100 p-4 rounded-lg shadow">
            <h2 className="text-sm text-slate-500 font-semibold uppercase">Reps Completed</h2>
            <p className="text-5xl font-bold text-blue-600">{output.repCount}</p>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg shadow">
            <h2 className="text-sm text-slate-500 font-semibold uppercase">Current State</h2>
            <p className={`text-3xl font-bold ${output.currentState === 'UP' ? 'text-green-500' : 'text-amber-500'}`}>
              {output.currentState}
            </p>
          </div>
          
          <div className="col-span-2 bg-slate-800 text-green-400 p-4 rounded-lg shadow font-mono text-sm">
            <h3 className="mb-2 text-white font-semibold">Debug Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <p>Angle: {output.currentAngle.toFixed(1)}°</p>
              <p>Velocity: {output.debug.velocity.toFixed(2)} °/s</p>
              <p>Max Angle (Current Rep): {output.debug.maxAngle.toFixed(1)}°</p>
              <p>Min Angle (Current Rep): {output.debug.minAngle.toFixed(1)}°</p>
            </div>
            
            {/* Visual angle indicator */}
            <div className="mt-4 w-full bg-gray-600 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all" 
                style={{ width: `${Math.min(100, (output.currentAngle / 180) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-gray-400">
              <span>0° (Down)</span>
              <span>180° (Up)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}