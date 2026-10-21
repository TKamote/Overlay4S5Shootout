"use client";

import LogoSelectionModal, { type Logo } from "@/components/LogoSelectionModal";
import type { LogoSlot } from "@/hooks/useOverlayLogos";

type OverlayLogoColumnProps = {
  canEdit: boolean;
  logo1URL: string;
  logo2URL: string;
  logo3URL: string;
  logos: Logo[];
  showLogo1Modal: boolean;
  showLogo2Modal: boolean;
  showLogo3Modal: boolean;
  setShowLogo1Modal: (open: boolean) => void;
  setShowLogo2Modal: (open: boolean) => void;
  setShowLogo3Modal: (open: boolean) => void;
  handleSelectLogo: (slot: LogoSlot, logo: Logo) => void;
  handleClearLogo: (slot: LogoSlot) => void;
};

function LogoSlotView({
  label,
  logoURL,
  canEdit,
  onPick,
  onClear,
}: {
  label: string;
  logoURL: string;
  canEdit: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  const hasLogo = Boolean(logoURL);

  if (!canEdit && !hasLogo) return null;

  return (
    <div className="group relative h-[110px] w-[110px]">
      <button
        type="button"
        onClick={() => canEdit && onPick()}
        className={`h-full w-full text-left ${canEdit ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
        title={canEdit ? "Click to pick a logo" : undefined}
      >
        {hasLogo ? (
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[50%] border-2 border-white bg-white shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoURL} alt={label} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[50%] border-2 border-dashed border-white/25 bg-white/5" />
        )}
      </button>
      {canEdit && hasLogo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute right-0.5 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-sm leading-none text-white opacity-0 transition-opacity hover:bg-black/75 hover:opacity-100 group-hover:opacity-40"
          title="Remove logo"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Three stacked logos top-left; empty slots hidden on OBS, dashed pick target when editing. */
export default function OverlayLogoColumn({
  canEdit,
  logo1URL,
  logo2URL,
  logo3URL,
  logos,
  showLogo1Modal,
  showLogo2Modal,
  showLogo3Modal,
  setShowLogo1Modal,
  setShowLogo2Modal,
  setShowLogo3Modal,
  handleSelectLogo,
  handleClearLogo,
}: OverlayLogoColumnProps) {
  const showColumn =
    canEdit || Boolean(logo1URL) || Boolean(logo2URL) || Boolean(logo3URL);

  if (!showColumn) return null;

  return (
    <>
      <div
        className="absolute z-10 flex flex-col items-start gap-2"
        style={{ top: "80px", left: "70px" }}
      >
        <LogoSlotView
          label="Logo 1"
          logoURL={logo1URL}
          canEdit={canEdit}
          onPick={() => setShowLogo1Modal(true)}
          onClear={() => handleClearLogo(1)}
        />
        <LogoSlotView
          label="Logo 2"
          logoURL={logo2URL}
          canEdit={canEdit}
          onPick={() => setShowLogo2Modal(true)}
          onClear={() => handleClearLogo(2)}
        />
        <LogoSlotView
          label="Logo 3"
          logoURL={logo3URL}
          canEdit={canEdit}
          onPick={() => setShowLogo3Modal(true)}
          onClear={() => handleClearLogo(3)}
        />
      </div>
      <LogoSelectionModal
        isOpen={showLogo1Modal}
        onClose={() => setShowLogo1Modal(false)}
        logos={logos}
        selectedLogoURL={logo1URL || null}
        onSelect={(logo) => {
          handleSelectLogo(1, logo);
          setShowLogo1Modal(false);
        }}
        title="Select Logo 1"
      />
      <LogoSelectionModal
        isOpen={showLogo2Modal}
        onClose={() => setShowLogo2Modal(false)}
        logos={logos}
        selectedLogoURL={logo2URL || null}
        onSelect={(logo) => {
          handleSelectLogo(2, logo);
          setShowLogo2Modal(false);
        }}
        title="Select Logo 2"
      />
      <LogoSelectionModal
        isOpen={showLogo3Modal}
        onClose={() => setShowLogo3Modal(false)}
        logos={logos}
        selectedLogoURL={logo3URL || null}
        onSelect={(logo) => {
          handleSelectLogo(3, logo);
          setShowLogo3Modal(false);
        }}
        title="Select Logo 3"
      />
    </>
  );
}
