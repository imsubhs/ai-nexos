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
export function AnnotationCanvas({
  children,
  onAddAnnotation,
  readOnly = false,
}: AnnotationCanvasProps) {
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
      className="group relative h-full w-full cursor-crosshair overflow-hidden"
      onClick={handleCanvasClick}
    >
      {/* The underlying asset (Image/Video) */}
      {children}

      {/* Overlay to indicate interactive area */}
      {!readOnly && (
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
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

export function ExtensibleViewer({
  format,
  src,
  watermarkContent,
  onTimeUpdate,
}: ExtensibleViewerProps) {
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
        return (
          <img
            src={src}
            alt="Share Asset"
            className="pointer-events-none max-h-full max-w-full object-contain select-none"
          />
        );
      case "VIDEO":
        return (
          <video
            ref={videoRef}
            src={src}
            controls
            controlsList="nodownload"
            onTimeUpdate={handleTimeUpdate}
            className="max-h-full max-w-full"
          />
        );
      case "PDF":
        // PDF viewer placeholder - would typically use react-pdf
        return (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
            [PDF Viewer Abstraction Rendered: {src}]
          </div>
        );
      default:
        return <div className="text-red-500">Unsupported Format</div>;
    }
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-slate-900 select-none">
      {renderViewer()}

      {/* 
        3. Dynamic Watermark Overlay
        Architecture Decision #6 & #13: Rendered on-the-fly, no permanent file modification.
      */}
      {watermarkContent && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30 mix-blend-overlay">
          <div className="repeat-watermark -rotate-45 transform text-4xl font-bold whitespace-nowrap text-white">
            {watermarkContent}
          </div>
        </div>
      )}
    </div>
  );
}
