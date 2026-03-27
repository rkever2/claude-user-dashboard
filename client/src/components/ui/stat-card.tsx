import { useState, useRef, useEffect } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 4a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 4Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Tooltip({ text, anchorRef }: { text: string; anchorRef: React.RefObject<HTMLElement | null> }) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<"bottom" | "top">("bottom");

  useEffect(() => {
    if (!tipRef.current || !anchorRef.current) return;
    const tipRect = tipRef.current.getBoundingClientRect();
    if (tipRect.bottom > window.innerHeight) {
      setPos("top");
    }
  }, [anchorRef]);

  return (
    <div
      ref={tipRef}
      className={`absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded bg-[#1a1a1a] px-3 py-2 text-xs leading-relaxed text-neutral-200 shadow-lg dark:bg-[#1a1a1a] ${
        pos === "top" ? "bottom-full mb-2" : "top-full mt-2"
      }`}
    >
      {text}
    </div>
  );
}

export function StatCard({ label, value, sub, tooltip }: StatCardProps) {
  const [showTip, setShowTip] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);

  return (
    <div className="border border-border p-5">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-muted">
          {label}
        </p>
        {tooltip && (
          <span
            ref={iconRef}
            className="relative cursor-help"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <InfoIcon className="w-3.5 h-3.5 text-muted-light hover:text-muted transition-colors" />
            {showTip && <Tooltip text={tooltip} anchorRef={iconRef} />}
          </span>
        )}
      </div>
      <p className="font-display text-3xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-light mt-1">{sub}</p>}
    </div>
  );
}
