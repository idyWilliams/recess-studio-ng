'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createGameSession, ApiClientError } from '@/lib/api-client';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';
import { WHOT_RULE_PRESETS, type WhotHouseRules } from '@recess/game-whot';
import { triggerHaptic } from '@/lib/haptics';

export default function WhotLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof WHOT_RULE_PRESETS>('naija_street');
  const [customRules, setCustomRules] = useState<WhotHouseRules>({
    ...WHOT_RULE_PRESETS.naija_street,
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBotStarting, setIsBotStarting] = useState(false);
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
    triggerHaptic('light');
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

  const handlePlayBot = () => {
    triggerHaptic('light');
    setIsBotStarting(true);
    router.push('/games/whot/demo-match');
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16161A] border border-white/[0.06]">
          <svg className="w-5 h-5 text-[#C8B28A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="4" width="10" height="14" rx="2" stroke="currentColor" />
            <rect x="9" y="6" width="10" height="14" rx="2" stroke="currentColor" opacity="0.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-[#F4F4F0]">
            Whot! Classic
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Authentic Nigerian card duel with configurable house rules.
          </p>
        </div>
      </header>

      {!profile ? (
        <RegisterCard
          title="Join Whot! Arena"
          description="Pick your player handle — opponents see your card table username on WhatsApp."
          isPending={register.isPending}
          error={register.error instanceof ApiClientError ? register.error.message : null}
          onRegister={(username) => register.mutate(username)}
        />
      ) : (
        <div className="space-y-5">
          {/* House Rules Configurator Card */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#121214] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#8E8E93]">
                  Rules Configurator
                </span>
                <h2 className="text-sm font-medium text-[#F4F4F0]">House Rules Preset</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="text-xs font-medium text-[#C8B28A] hover:text-[#d7c49f] transition-colors"
              >
                {isCustomizing ? 'Hide Toggles' : 'Custom Rules'}
              </button>
            </div>

            {/* Preset Selector Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('naija_street')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedPreset === 'naija_street'
                    ? 'border-[#C8B28A] bg-[#1A1A1E] text-[#F4F4F0]'
                    : 'border-white/[0.06] bg-[#161619] text-[#8E8E93] hover:text-[#E4E4E0]'
                }`}
              >
                <span className="text-xs font-medium">Street Classic</span>
                <span className="text-[10px] text-[#52525B] mt-1">20s On • 14 Go Gen</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('pure_no_20')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedPreset === 'pure_no_20'
                    ? 'border-[#C8B28A] bg-[#1A1A1E] text-[#F4F4F0]'
                    : 'border-white/[0.06] bg-[#161619] text-[#8E8E93] hover:text-[#E4E4E0]'
                }`}
              >
                <span className="text-xs font-medium">Pure Skill</span>
                <span className="text-[10px] text-[#52525B] mt-1">No 20s • 49 Cards</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('campus_chaos')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedPreset === 'campus_chaos'
                    ? 'border-[#C8B28A] bg-[#1A1A1E] text-[#F4F4F0]'
                    : 'border-white/[0.06] bg-[#161619] text-[#8E8E93] hover:text-[#E4E4E0]'
                }`}
              >
                <span className="text-xs font-medium">Campus Chaos</span>
                <span className="text-[10px] text-[#52525B] mt-1">7 = Pick 2 • Stacking</span>
              </button>
            </div>

            {/* Custom Rules Toggles Drawer */}
            {isCustomizing && (
              <div className="mt-3 space-y-2.5 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">Exclude All 20 Cards (49-card deck)</span>
                  <input
                    type="checkbox"
                    checked={customRules.excludeWhot20}
                    onChange={() => handleToggleRule('excludeWhot20')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">14 = &quot;Go Gen!&quot; (General Market)</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule14GoGen}
                    onChange={() => handleToggleRule('rule14GoGen')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">2 = &quot;Pick Two&quot;</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule2PickTwo}
                    onChange={() => handleToggleRule('rule2PickTwo')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">5 = &quot;Pick Three&quot; (Heavy Penalty)</span>
                  <input
                    type="checkbox"
                    checked={customRules.rule5PickThree}
                    onChange={() => handleToggleRule('rule5PickThree')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">Penalty Stacking (&quot;Bombing&quot;)</span>
                  <input
                    type="checkbox"
                    checked={customRules.allowPenaltyStacking}
                    onChange={() => handleToggleRule('allowPenaltyStacking')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E8E93]">Cannot Check Up on Power Card</span>
                  <input
                    type="checkbox"
                    checked={!customRules.allowWinOnSpecial}
                    onChange={() => handleToggleRule('allowWinOnSpecial')}
                    className="accent-[#C8B28A] h-4 w-4 rounded"
                  />
                </div>
              </div>
            )}

            {/* Active Rule Badges */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#161619] border border-white/[0.06] text-[#8E8E93]">
                {customRules.excludeWhot20 ? 'No 20s' : '20s Wild'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#161619] border border-white/[0.06] text-[#8E8E93]">
                {customRules.rule14GoGen ? '14 = Go Gen' : '14 = Normal'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#161619] border border-white/[0.06] text-[#8E8E93]">
                {customRules.allowPenaltyStacking ? 'Stacking On' : 'No Stacking'}
              </span>
              {customRules.rule7Variant === 'pick_two' && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#161619] border border-[#C8B28A]/30 text-[#C8B28A]">
                  7 = Pick Two
                </span>
              )}
            </div>
          </section>

          {/* Action Launchers */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isCreating || isBotStarting}
              onClick={handleStartMatch}
              className="w-full py-3.5 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-[#0A0A0B] border-t-transparent animate-spin" />
                  <span>Preparing table...</span>
                </>
              ) : (
                <span>Create Match & Invite via WhatsApp</span>
              )}
            </button>

            <button
              type="button"
              disabled={isCreating || isBotStarting}
              onClick={handlePlayBot}
              className="w-full py-3 rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] text-[#E4E4E0] font-medium text-sm text-center flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isBotStarting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-[#E4E4E0] border-t-transparent animate-spin" />
                  <span>Loading Bot Arena...</span>
                </>
              ) : (
                <span>Play vs Smart Bot</span>
              )}
            </button>

            {errorMessage && (
              <p className="text-xs text-rose-400 text-center font-medium">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
