'use client';

type AuthUserBarProps = {
  label: string;
  onSignOut: () => void | Promise<void>;
};

export function AuthUserBar({ label, onSignOut }: AuthUserBarProps) {
  return (
    <div className="ml-auto flex items-center gap-3 text-sm text-white/90">
      <span className="max-w-[14rem] truncate" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="rounded border border-white/40 px-2 py-1 font-medium text-white hover:bg-white/10"
      >
        Sign out
      </button>
    </div>
  );
}
