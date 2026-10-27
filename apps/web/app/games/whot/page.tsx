'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createGameSession, ApiClientError } from '@/lib/api-client';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';
import { WHOT_RULE_PRESETS, type WhotHouseRules } from '@recess/game-whot';

export default function WhotLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof WHOT_RULE_PRESETS>('naija_street');
  const [customRules, setCustomRules] = useState<WhotHouseRules>({
    ...WHOT_RULE_PRESETS.naija_street,
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePresetSelect = (presetKey: keyof typeof WHOT_RULE_PRESETS) => {
    setSelectedPreset(presetKey);
    setCustomRules({ ...WHOT_RULE_PRESETS[presetKey] });
  };

  const handleToggleRule = (key: keyof WhotHouseRules) => {
    setCustomRules((prev: WhotHouseRules) => {
      const next = { ...prev };
      if (typeof next[key] === 'boolean') {
        (next as Record<string, unknown>)[key] = !next[key];
      }
      return next;
    });
  };

  const handleStartMatch = async () => {
    if (!sessionToken || isCreating) return;
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const session = await createGameSession(sessionToken, 'whot', {
        houseRules: customRules,
      });
      router.push(`/games/whot/${session.publicId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        // Fallback to local demo match
        router.push(`/games/whot/demo-match`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(180,83,9,0.7) 0%, rgba(122,28,36,0.85) 100%)',
          }}
        >
          <span className="text-2xl">🎴</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Whot! Naija Classic
          </h1>
          <p className="text-xs text-white/60">
            Authentic Nigerian street card duel with configurable house rules.
          </p>
        </div>
      </header>

      {!profile ? (
        <RegisterCard
          title="Join Whot! Naija Arena"
          description="Pick your player handle — opponents see your card table username on WhatsApp."
          isPending={register.isPending}
          error={register.error instanceof ApiClientError ? register.error.message : null}
          onRegister={(username) => register.mutate(username)}
        />
      ) : (
        <div className="space-y-5">
          {/* House Rules Configurator Card */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Nigerian Street Setup
                </span>
                <h2 className="text-base font-black text-white">House Rules Preset</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4"
              >
                {isCustomizing ? 'Hide Toggles' : 'Custom Rules'}
              </button>
            </div>

            {/* Preset Selector Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('naija_street')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  selectedPreset === 'naija_street'
                    ? 'border-amber-400 bg-amber-500/20 text-white shadow-glow-gold'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-black">🇳🇬 Street Classic</span>
                <span className="text-[10px] text-white/50 mt-1">20s On • 14 Go Gen • Bombing</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('pure_no_20')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  selectedPreset === 'pure_no_20'
                    ? 'border-rose-400 bg-rose-500/20 text-white shadow-glow-red'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-black">🚫 Pure Skill</span>
                <span className="text-[10px] text-white/50 mt-1">No 20s (49 Cards) • 7 Pick 2</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('campus_chaos')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  selectedPreset === 'campus_chaos'
                    ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-glow-emerald'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-black">🔥 Campus Chaos</span>
                <span className="text-[10px] text-white/50 mt-1">7 = Pick 2 • Heavy Stacking</span>
              </button>
            </div>

            {/* Custom Rules Toggles Drawer */}
            {isCustomizing && (
              <div className="mt-3 space-y-2.5 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">Exclude All 20 Cards (49-card deck)</span>
                  <input
                    type="checkbox"
                    checked={customRules.excludeWhot20}
                    onChange={() => handleToggleRule('excludeWhot20')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">14 = &quot;Go Gen!&quot; (General Market)</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule14GoGen}
                    onChange={() => handleToggleRule('rule14GoGen')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">2 = &quot;Pick Two&quot;</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule2PickTwo}
                    onChange={() => handleToggleRule('rule2PickTwo')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">5 = &quot;Pick Three&quot; (Heavy Artillery)</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule5PickThree}
                    onChange={() => handleToggleRule('rule5PickThree')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">Penalty Stacking (&quot;Bombing&quot;)</span>
                  <input
                    type="checkbox"
                    checked={customRules.allowPenaltyStacking}
                    onChange={() => handleToggleRule('allowPenaltyStacking')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80">Cannot Check Up on Power Card</span>
                  <input
                    type="checkbox"
                    checked={!customRules.allowWinOnSpecial}
                    onChange={() => handleToggleRule('allowWinOnSpecial')}
                    className="accent-amber-500 h-4 w-4 rounded"
                  />
                </div>
              </div>
            )}

            {/* Active Rule Badges */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/5 border border-white/10 text-white/70">
                {customRules.excludeWhot20 ? '🚫 No 20s' : '👑 20s Wild'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/5 border border-white/10 text-white/70">
                {customRules.rule14GoGen ? '🛒 14 = Go Gen' : '14 = Normal'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/5 border border-white/10 text-white/70">
                {customRules.allowPenaltyStacking ? '💣 Stacking ON' : '🛡️ No Stacking'}
              </span>
              {customRules.rule7Variant === 'pick_two' && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  7️⃣ = Pick Two
                </span>
              )}
            </div>
          </section>

          {/* Action Launchers */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isCreating}
              onClick={handleStartMatch}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-amber-600 text-white font-black text-base shadow-xl hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>{isCreating ? 'Creating Table...' : 'Create Match & Invite via WhatsApp'}</span>
              <span>⚔️</span>
            </button>

            <Link
              href="/games/whot/demo-match"
              className="w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-sm text-center block transition-all"
            >
              ⚡ Play Solo vs Smart Naija Bot (Instant Play)
            </Link>

            {errorMessage && (
              <p className="text-xs text-rose-400 text-center font-medium">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
