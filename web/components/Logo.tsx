// AuditFlow logomark: a security shield with a flow-check inside (audit → fix).
// Monochrome via currentColor so it adapts to any background — set color with
// text-* / style on the parent. Default size 20px; override with className.
export function LogoMark({ className = "h-5 w-5", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* shield */}
      <path
        d="M12 2.4 4.5 5.2v6.1c0 4.6 3.1 8.4 7.5 10.3 4.4-1.9 7.5-5.7 7.5-10.3V5.2L12 2.4Z"
        fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* flow-check */}
      <path
        d="M8 12.2l2.6 2.6L16 9.4"
        stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// Logo + wordmark lockup used in headers/footers.
export function Logo({ className = "", textClassName = "text-sm font-semibold", markClassName = "h-5 w-5" }: {
  className?: string; textClassName?: string; markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} title="AuditFlow" />
      <span className={textClassName}>AuditFlow</span>
    </span>
  );
}
