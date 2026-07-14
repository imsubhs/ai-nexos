"use client";

import React, { useState, useRef, MouseEvent } from "react";
import { NormalizedCoordinates, ViewerFormat } from "../../types";

interface AnnotationCanvasProps {
  children: React.ReactNode;
  onAddAnnotation: (coords: NormalizedCoordinates) => void;
  readOnly?: boolean;
}

/**
 * 1. Annotation Canvas
 * Architecture Decision #3: Normalized coordinates. Never pixels.
 */
export function AnnotationCanvas({ children, onAddAnnotation, readOnly = false }: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate normalized coordinates (0.0 to 1.0)
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    
    // Ensure bounds
    if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
      onAddAnnotation({ normX, normY });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-crosshair group"
      onClick={handleCanvasClick}
    >
      {/* The underlying asset (Image/Video) */}
      {children}
      
      {/* Overlay to indicate interactive area */}
      {!readOnly && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      )}
    </div>
  );
}

/**
 * 2. Extensible Viewer Abstraction
 * Architecture Decision #4: Support Image, Video, PDF, Future Viewers.
 */
interface ExtensibleViewerProps {
  format: ViewerFormat;
  src: string;
  watermarkContent?: string;
  onTimeUpdate?: (timeMs: number) => void; // Architecture Decision #12: Millisecond precision
}

export function ExtensibleViewer({ format, src, watermarkContent, onTimeUpdate }: ExtensibleViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      // Convert seconds to milliseconds
      onTimeUpdate(Math.floor(videoRef.current.currentTime * 1000));
    }
  };

  const renderViewer = () => {
    switch (format) {
      case "IMAGE":
        return <img src={src} alt="Share Asset" className="max-w-full max-h-full object-contain pointer-events-none select-none" />;
      case "VIDEO":
        return (
          <video 
            ref={videoRef}
            src={src} 
            controls 
            controlsList="nodownload"
            onTimeUpdate={handleTimeUpdate}
            className="max-w-full max-h-full"
          />
        );
      case "PDF":
        // PDF viewer placeholder - would typically use react-pdf
        return (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
            [PDF Viewer Abstraction Rendered: {src}]
          </div>
        );
      default:
        return <div className="text-red-500">Unsupported Format</div>;
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900 select-none">
      {renderViewer()}
      
      {/* 
        3. Dynamic Watermark Overlay
        Architecture Decision #6 & #13: Rendered on-the-fly, no permanent file modification.
      */}
      {watermarkContent && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-30 mix-blend-overlay">
          <div className="text-white text-4xl font-bold transform -rotate-45 whitespace-nowrap repeat-watermark">
            {watermarkContent}
          </div>
        </div>
      )}
    </div>
  );
}
