import { LobbyHeader } from '@/components/home/LobbyHeader';
import { ActiveTurnHero } from '@/components/home/ActiveTurnHero';
import { ArcadeBentoGrid } from '@/components/home/ArcadeBentoGrid';

export default function HomePage() {
  return (
    <main className="arcade-bg min-h-dvh">
      <div className="mx-auto flex max-w-lg flex-col px-4 py-5 space-y-6 sm:px-6">
        {/* Live Active Turn Ticker, Rivalry Pill & Arcade Greeting */}
        <LobbyHeader />

        {/* Primary Action: Active Game Turn Card (honest state when none active) */}
        <ActiveTurnHero />

        {/* Tactile Arcade Bento Grid: Word Battle, Mancala Royale, Whot!, Ludo */}
        <ArcadeBentoGrid />
      </div>
    </main>
  );
}
