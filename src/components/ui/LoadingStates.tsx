import React from "react";
import Image from "next/image";

export const LoadingSpinner: React.FC<{ label?: string; size?: "sm" | "md" | "lg" }> = ({
  label = "Loading",
  size = "md",
}) => {
  const dimensions = size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-12 w-12 border-[3px]" : "h-8 w-8 border-[3px]";
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <span className={`${dimensions} rounded-full border-current border-t-transparent animate-soft-spin`} />
      <span className="sr-only">{label}</span>
    </span>
  );
};

export const AuthLoadingScreen: React.FC = () => (
  <main className="auth-loading-screen" aria-live="polite" aria-busy="true">
    <div className="auth-loading-card">
      <Image src="/logo.png" alt="" width={64} height={64} priority className="rounded-2xl" />
      <LoadingSpinner label="Checking your sign-in" size="lg" />
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Basechan Asset Manager</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Checking your secure session…</p>
      </div>
      <div className="auth-loading-lines" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  </main>
);

const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <div aria-hidden="true" className={`skeleton-shimmer rounded-lg ${className}`} />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Loading your dashboard" aria-busy="true">
    <span className="sr-only">Loading your dashboard</span>
    <Skeleton className="h-36 w-full rounded-2xl" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  </div>
);
