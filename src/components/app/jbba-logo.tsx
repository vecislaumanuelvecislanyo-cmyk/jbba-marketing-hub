import { cn } from "@/lib/utils";

export function JbbaLogo({ className, alt = "JBBA Prestação de Serviços Empresariais" }: { className?: string; alt?: string }) {
  return (
    <svg className={cn("h-auto w-auto", className)} viewBox="0 0 720 360" role="img" aria-label={alt}>
      <defs>
        <linearGradient id="jbbaGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff2a6" />
          <stop offset="28%" stopColor="#d69a16" />
          <stop offset="52%" stopColor="#fff0a0" />
          <stop offset="78%" stopColor="#b87908" />
          <stop offset="100%" stopColor="#f6d35d" />
        </linearGradient>
      </defs>
      <g fill="url(#jbbaGold)" stroke="#8b5e08" strokeWidth="3">
        <path d="M92 28l30 8 8 34-29 19-26-23zM190 36l28 13-3 34-34 12-21-27zM40 98l22-21 31 13 3 35-30 15zM20 198l7-32 34-9 22 27-13 31-34 5zM67 292l-20-26 15-32 34-4 18 29-17 28zM166 325l-31-12-4-34 29-18 28 22-1 34zM251 286l-27-17 5-34 34-13 25 23-8 32z" />
        <circle cx="142" cy="170" r="105" fill="none" strokeWidth="18" />
        <circle cx="142" cy="170" r="72" fill="none" strokeWidth="8" />
      </g>
      <text x="90" y="226" fontFamily="Arial, sans-serif" fontSize="145" fontWeight="800" letterSpacing="-8" fill="url(#jbbaGold)" stroke="#8b5e08" strokeWidth="3">JBBA</text>
      <text x="286" y="284" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="600" letterSpacing="1.5" fill="url(#jbbaGold)">PRESTAÇÃO DE SERVIÇOS EMPRESARIAIS</text>
    </svg>
  );
}
