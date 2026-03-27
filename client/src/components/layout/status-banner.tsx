import { useHealth } from "@/hooks/use-queries";

export function StatusBanner() {
  const { data: health } = useHealth();

  if (!health || health.status === "ok") return null;

  const isError = health.status === "error";
  const borderColor = isError ? "border-error" : "border-warning";
  const bgColor = isError ? "bg-error-light" : "bg-warning-light";
  const textColor = isError ? "text-error" : "text-warning";

  return (
    <div className={`border-b ${borderColor} ${bgColor} px-8 py-4`}>
      <div className="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 ${textColor} shrink-0 mt-0.5`}
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className={`text-[11px] uppercase tracking-[0.05em] font-semibold ${textColor} mb-1`}>
            {isError ? "Setup Required" : "Limited Data"}
          </p>
          <ul className="text-sm space-y-1">
            {health.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
