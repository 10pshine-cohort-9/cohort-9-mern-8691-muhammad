"use client";

import React, { forwardRef } from "react";
import {
  SunIcon as AnimateSun,
  MoonIcon as AnimateMoon,
  LoaderCircleIcon as AnimateLoader,
  SparklesIcon as AnimateSparkles,
  CheckIcon as AnimateCheck,
  EyeIcon as AnimateEye,
  EyeClosedIcon as AnimateEyeClosed,
  UserRoundIcon as AnimateUserCircle,
  LogOutIcon as AnimateLogOut,
  FileTextIcon as AnimateFileText,
  ArrowLeftIcon as AnimateArrowLeft,
} from "@animateicons/react/lucide";

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string;
  className?: string;
  isAnimated?: boolean;
}

// This higher order function is just to make every icon containerized into a specific size to be used anywhere.
function wrapIcon(
  Component: React.ComponentType<Record<string, unknown>>,
  displayName: string,
) {
  const Wrapped = forwardRef<HTMLDivElement, IconProps>(
    ({ size = 18, color, className = "", isAnimated = true, ...rest }, ref) => {
      return (
        <div
          ref={ref}
          className={`inline-flex items-center justify-center shrink-0 ${className}`}
          style={{ width: size, height: size }}
          {...rest}
        >
          <Component size={size} color={color} isAnimated={isAnimated} />
        </div>
      );
    },
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const IconSun = wrapIcon(AnimateSun, "IconSun");
export const IconMoon = wrapIcon(AnimateMoon, "IconMoon");
export const IconLoader = wrapIcon(AnimateLoader, "IconLoader");
export const IconSparkles = wrapIcon(AnimateSparkles, "IconSparkles");
export const IconCheck = wrapIcon(AnimateCheck, "IconCheck");
export const IconEye = wrapIcon(AnimateEye, "IconEye");
export const IconEyeClosed = wrapIcon(AnimateEyeClosed, "IconEyeClosed");
export const IconUserCircle = wrapIcon(AnimateUserCircle, "IconUserCircle");
export const IconLogout = wrapIcon(AnimateLogOut, "IconLogout");
export const IconNotes = wrapIcon(AnimateFileText, "IconNotes");
export const IconArrowLeft = wrapIcon(AnimateArrowLeft, "IconArrowLeft");
