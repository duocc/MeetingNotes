import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface AudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const analyzerRef = useRef<AnalyserNode>(null);

  useEffect(() => {
    if (isRecording && stream && canvasRef.current) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const draw = () => {
        if (!ctx) return;
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          
          // Immersive UI Red Accent
          ctx.fillStyle = `rgba(255, 69, 58, ${0.4 + (dataArray[i] / 255) * 0.6})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 2;
        }
      };

      draw();

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        audioContext.close();
      };
    }
  }, [isRecording, stream]);

  return (
    <div className="w-full h-24 bg-black/20 rounded-2xl overflow-hidden flex items-end justify-center px-4 mb-6 border border-white/5 shadow-inner relative">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100} 
        className="w-full h-full opacity-80" 
      />
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-text-secondary text-sm font-medium tracking-wide">等待录音输入...</p>
        </div>
      )}
    </div>
  );
};
