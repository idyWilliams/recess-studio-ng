export default function GamesLoading() {
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

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm w-full text-center">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-[#00A884] animate-spin" />
          <span className="absolute text-xl">🎲</span>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2A3942] bg-[#182229] px-4 py-1.5 text-xs font-semibold text-[#00A884] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#00A884] animate-ping" />
            <span>Loading Game Arena...</span>
          </div>
          <p className="text-[11px] text-[#8696A0]">
            Pulling live duel session & rules definition
          </p>
        </div>

        {/* Shimmer skeleton board card */}
        <div className="w-full rounded-2xl border border-[#2A3942] bg-[#1F2C34]/50 p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-[#2A3942]" />
            <div className="h-4 w-28 rounded bg-[#2A3942]" />
            <div className="h-8 w-8 rounded-full bg-[#2A3942]" />
          </div>
          <div className="h-32 rounded-xl bg-[#2A3942]/60" />
        </div>
      </div>
    </div>
  );
}
