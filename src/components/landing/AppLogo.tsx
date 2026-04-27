interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className = "w-7 h-7" }: AppLogoProps) {
  return (
    <img
      src="/favicon.ico"
      alt="Continuum"
      className={`${className} object-contain`}
      aria-hidden="true"
    />
  );
}
