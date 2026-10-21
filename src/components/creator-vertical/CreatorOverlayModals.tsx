"use client";

import PlayerSelectionModal from "@/components/PlayerSelectionModal";
import WinnerModal from "@/components/WinnerModal";
import StandbyModal from "@/components/StandbyModal";
import type { useOverlayMatch } from "@/hooks/useOverlayMatch";

type MatchState = ReturnType<typeof useOverlayMatch>;

export function CreatorOverlayModals({ m }: { m: MatchState }) {
  return (
    <>
      <PlayerSelectionModal
        isOpen={m.showPlayer1Modal}
        onClose={() => m.setShowPlayer1Modal(false)}
        players={m.players}
        selectedPlayerId={m.player1?.id || null}
        onSelect={m.handlePlayer1Select}
        title="Select Player A"
      />
      <PlayerSelectionModal
        isOpen={m.showPlayer2Modal}
        onClose={() => m.setShowPlayer2Modal(false)}
        players={m.players}
        selectedPlayerId={m.player2?.id || null}
        onSelect={m.handlePlayer2Select}
        title="Select Player B"
      />
      <WinnerModal
        isOpen={m.showWinnerModal}
        onClose={m.handleWinnerModalClose}
        winner={
          m.winner
            ? {
                id: m.winner.id,
                name: m.winner.name,
                photoURL: m.winner.photoURL,
                points: m.winner.points || 0,
              }
            : null
        }
        getPlayerPlaceholder={(playerId) => {
          const hash = playerId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return `/avatar-placeholder-${(hash % 6) + 1}.svg`;
        }}
        player1Score={m.player1Score}
        player2Score={m.player2Score}
        player1Name={m.getPlayer1Name()}
        player2Name={m.getPlayer2Name()}
      />
      <StandbyModal isOpen={m.isStandby} />
    </>
  );
}

export function BallResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-400 opacity-50 transition-opacity hover:opacity-100"
      title="Reset all balls"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
