import { PlayerBadge } from '@recess/ui';
import { WhatsAppInviteCard } from '@/components/social/WhatsAppInviteCard';

interface FriendEntry {
  id: string;
  username: string;
  avatarUrl: string;
  rating: number;
  presence: 'online' | 'in_game' | 'offline';
  statusText: string;
}

const mockFriends: FriendEntry[] = [
  {
    id: 'f1',
    username: 'Tunde',
    avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
    rating: 1485,
    presence: 'in_game',
    statusText: 'In match • Word Battle',
  },
  {
    id: 'f2',
    username: 'Amina',
    avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
    rating: 1390,
    presence: 'online',
    statusText: 'Online • Ready to play',
  },
  {
    id: 'f3',
    username: 'Efe',
    avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
    rating: 1520,
    presence: 'offline',
    statusText: 'Last seen 2h ago',
  },
];

export default function FriendsPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-recess-text-primary sm:text-3xl">
          Friends & Social
        </h1>
        <p className="text-xs text-recess-text-secondary">
          Find opponents, invite WhatsApp contacts, and see who is ready for a match.
        </p>
      </header>

      {/* WhatsApp Doorway */}
      <WhatsAppInviteCard />

      {/* Active Friends List */}
      <section aria-label="Friends List" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
            Recent Opponents ({mockFriends.length})
          </h2>
        </div>

        <div className="divide-y divide-recess-cream-border rounded-2xl border border-recess-cream-border bg-white shadow-card overflow-hidden">
          {mockFriends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-3.5 transition-colors hover:bg-neutral-50"
            >
              <PlayerBadge
                username={friend.username}
                avatarUrl={friend.avatarUrl}
                rating={friend.rating}
                presence={friend.presence}
                subtitle={friend.statusText}
                size="md"
              />
              <button
                type="button"
                className="rounded-lg bg-recess-purple-light px-3 py-1.5 text-xs font-bold text-recess-purple transition-all hover:bg-recess-purple hover:text-white active:scale-95"
              >
                Challenge
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
