type IconProps = {
  className?: string;
};

function Svg({ className = "h-4 w-4", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function StarIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.94 6.02 6.56.9-4.78 4.6 1.2 6.5L12 17.4l-5.92 3.12 1.2-6.5L2.5 9.42l6.56-.9L12 2.5z" />
    </svg>
  );
}

export function RouteIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H15a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h6.5" />
    </Svg>
  );
}

export function RoadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3" />
    </Svg>
  );
}

export function ChildIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="6" r="3" />
      <path d="M6 21v-3a6 6 0 0112 0v3" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4v16M6 20h12M5 7h14" />
      <path d="M5 7l-3 7a3 3 0 006 0L5 7zM19 7l-3 7a3 3 0 006 0l-3-7z" />
    </Svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
    </Svg>
  );
}
