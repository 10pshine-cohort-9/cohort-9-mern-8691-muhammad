"use client";

import React, { forwardRef } from "react";
import {
  EyeIcon as AnimateEye,
  EyeClosedIcon as AnimateEyeClosed,
  EyeOffIcon as AnimateEyeOff,
  Trash2Icon as AnimateTrash,
  PinIcon as AnimatePin,
  PinOffIcon as AnimatePinOff,
  StarIcon as AnimateStar,
  BellRingIcon as AnimateBell,
  SearchIcon as AnimateSearch,
  SunIcon as AnimateSun,
  MoonIcon as AnimateMoon,
  PlusIcon as AnimatePlus,
  PencilIcon as AnimatePencil,
  ShareIcon as AnimateShare,
  UserPlusIcon as AnimateUserPlus,
  UsersIcon as AnimateUsers,
  UserRoundIcon as AnimateUserCircle,
  UploadIcon as AnimateUpload,
  DownloadIcon as AnimateDownload,
  LogOutIcon as AnimateLogOut,
  CheckIcon as AnimateCheck,
  XIcon as AnimateX,
  FileTextIcon as AnimateFileText,
  ArrowLeftIcon as AnimateArrowLeft,
  SparklesIcon as AnimateSparkles,
  TagIcon as AnimateTag,
  HistoryIcon as AnimateHistory,
  ClockIcon as AnimateClock,
  ArrowRightIcon as AnimateArrowRight,
  LoaderCircleIcon as AnimateLoader,
  ChevronDownIcon as AnimateChevronDown,
} from "@animateicons/react/lucide";

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string;
  className?: string;
  isAnimated?: boolean;
}

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

export const IconEye = wrapIcon(AnimateEye, "IconEye");
export const IconEyeClosed = wrapIcon(AnimateEyeClosed, "IconEyeClosed");
export const IconEyeOff = wrapIcon(AnimateEyeOff, "IconEyeOff");
export const IconTrash = wrapIcon(AnimateTrash, "IconTrash");
export const IconPin = wrapIcon(AnimatePin, "IconPin");
export const IconPinOff = wrapIcon(AnimatePinOff, "IconPinOff");
export const IconStar = wrapIcon(AnimateStar, "IconStar");
export const IconBell = wrapIcon(AnimateBell, "IconBell");
export const IconSearch = wrapIcon(AnimateSearch, "IconSearch");
export const IconSun = wrapIcon(AnimateSun, "IconSun");
export const IconMoon = wrapIcon(AnimateMoon, "IconMoon");
export const IconPlus = wrapIcon(AnimatePlus, "IconPlus");
export const IconPencil = wrapIcon(AnimatePencil, "IconPencil");
export const IconShare = wrapIcon(AnimateShare, "IconShare");
export const IconUserPlus = wrapIcon(AnimateUserPlus, "IconUserPlus");
export const IconUsers = wrapIcon(AnimateUsers, "IconUsers");
export const IconUserCircle = wrapIcon(AnimateUserCircle, "IconUserCircle");
export const IconUpload = wrapIcon(AnimateUpload, "IconUpload");
export const IconDownload = wrapIcon(AnimateDownload, "IconDownload");
export const IconLogout = wrapIcon(AnimateLogOut, "IconLogout");
export const IconCheck = wrapIcon(AnimateCheck, "IconCheck");
export const IconClose = wrapIcon(AnimateX, "IconClose");
export const IconNotes = wrapIcon(AnimateFileText, "IconNotes");
export const IconArrowLeft = wrapIcon(AnimateArrowLeft, "IconArrowLeft");
export const IconFileText = wrapIcon(AnimateFileText, "IconFileText");
export const IconSparkles = wrapIcon(AnimateSparkles, "IconSparkles");
export const IconTag = wrapIcon(AnimateTag, "IconTag");
export const IconHistory = wrapIcon(AnimateHistory, "IconHistory");
export const IconClock = wrapIcon(AnimateClock, "IconClock");
export const IconArrowRight = wrapIcon(AnimateArrowRight, "IconArrowRight");
export const IconLoader = wrapIcon(AnimateLoader, "IconLoader");
export const IconChevronDown = wrapIcon(AnimateChevronDown, "IconChevronDown");

// Filled variants
export function IconPinFilled({
  size = 18,
  className = "",
}: Readonly<{
  size?: number;
  className?: string;
}>) {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 text-amber-500 ${className}`}
    >
      <AnimatePin size={size} isAnimated={true} />
    </div>
  );
}

export function IconStarFilled({
  size = 18,
  className = "",
}: Readonly<{
  size?: number;
  className?: string;
}>) {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 text-rose-500 ${className}`}
    >
      <AnimateStar size={size} isAnimated={true} />
    </div>
  );
}
