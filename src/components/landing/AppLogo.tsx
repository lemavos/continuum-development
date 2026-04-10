interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className = "w-7 h-7" }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#12151a" />
      <circle cx="32" cy="32" r="11" fill="#7ee7d8" />
      <circle cx="16" cy="18" r="6" fill="#7ee7d8" opacity="0.75" />
      <circle cx="48" cy="18" r="6" fill="#7ee7d8" opacity="0.75" />
      <circle cx="16" cy="46" r="6" fill="#7ee7d8" opacity="0.75" />
      <circle cx="48" cy="46" r="6" fill="#7ee7d8" opacity="0.75" />
    </svg>
  );
}
