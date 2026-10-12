/**
 * Word Battle arena layout — overrides the root platform shell.
 * The game is fullscreen immersive; no app header, bottom nav, or body padding.
 */
export default function WordBattleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
