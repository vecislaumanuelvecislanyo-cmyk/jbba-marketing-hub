import { cn } from "@/lib/utils";
import logoAsset from "@/assets/jbba-logo.png.asset.json";

export function JbbaLogo({ className, alt = "JBBA Prestação de Serviços Empresariais" }: { className?: string; alt?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn("h-auto w-auto object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
