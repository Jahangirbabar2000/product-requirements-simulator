"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

// Green -> yellow -> orange -> red gradient signaling "cooler" to "hotter" as value rises.
const HEATMAP_GRADIENT =
  "linear-gradient(to right, #10b981 0%, #34d399 20%, #fbbf24 50%, #f97316 75%, #ef4444 100%)";

function HeatmapSlider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  const current = _values[0] ?? min;
  const pct = ((current - min) / Math.max(max - min, 1)) * 100;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full h-3 w-full"
        style={{
          backgroundImage: HEATMAP_GRADIENT,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {/* Dim the unfilled portion so the filled portion pops */}
        <div
          aria-hidden
          className="absolute top-0 right-0 h-full bg-white/55 dark:bg-black/40 transition-[width] duration-150"
          style={{ width: `${100 - pct}%` }}
        />
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-transparent"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-5 shrink-0 rounded-full border-2 border-white bg-white ring-1 ring-black/15 shadow-md transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          style={{
            backgroundImage: HEATMAP_GRADIENT,
            backgroundSize: `${((max - min) / Math.max(max - min, 1)) * 100}% 100%`,
            backgroundPosition: `${pct}% center`,
          }}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { HeatmapSlider };
