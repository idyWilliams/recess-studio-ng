export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B141A] text-white px-4">
      {/* Subtle WhatsApp chat wallpaper pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(#FFFFFF 1.5px, transparent 1.5px), radial-gradient(#FFFFFF 1.5px, #0B141A 1.5px)',
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      />

      {/* WhatsApp Mini-App Shell Skeleton Shimmer */}
      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm w-full text-center">
        {/* Recess Emerald Spinning Ring */}
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-[#00A884] animate-spin" />
          <div className="absolute flex h-9 w-9 items-center justify-center rounded-xl bg-[#00A884] text-[#08120E] font-black text-sm shadow-md">
            R
          </div>
        </div>

        {/* Status Pill */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2A3942] bg-[#182229] px-4 py-1.5 text-xs font-semibold text-[#00A884] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#00A884] animate-ping" />
            <span>Connecting to Recess Table...</span>
          </div>
          <p className="text-[11px] text-[#8696A0]">
            Syncing authoritative board state & WhatsApp vault
          </p>
        </div>

        {/* Shimmer skeleton bar */}
        <div className="w-full space-y-2.5 pt-4">
          <div className="h-3 w-3/4 mx-auto rounded-full bg-[#1F2C34] animate-pulse" />
          <div className="h-2.5 w-1/2 mx-auto rounded-full bg-[#1F2C34]/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
