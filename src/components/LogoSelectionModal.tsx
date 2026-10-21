"use client";

import { useState } from "react";

export interface Logo {
  id: string;
  name: string;
  logoURL: string;
}

interface LogoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  logos: Logo[];
  selectedLogoURL: string | null;
  onSelect: (logo: Logo) => void;
  title: string;
}

const LogoSelectionModal = ({
  isOpen,
  onClose,
  logos,
  selectedLogoURL,
  onSelect,
  title,
}: LogoSelectionModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredLogos = logos.filter((logo) =>
    logo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logos..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLogos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">
                {searchQuery ? "No logos found" : "No logos available. Add logos on the Players page."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {filteredLogos.map((logo) => {
                const isSelected = logo.logoURL === selectedLogoURL;
                return (
                  <button
                    key={logo.id}
                    onClick={() => {
                      onSelect(logo);
                      onClose();
                    }}
                    className={`flex flex-col items-center rounded-lg border-2 p-3 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-gray-100 sm:h-20 sm:w-20">
                      {logo.logoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo.logoURL} alt={logo.name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-2xl text-gray-400">?</span>
                      )}
                    </div>
                    <span className="mt-2 w-full truncate text-center text-sm font-medium text-gray-900">
                      {logo.name}
                    </span>
                    {isSelected && <span className="text-xs font-medium text-blue-600">Selected</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoSelectionModal;
