"use client";

import RackBall from "@/components/balls/RackBall";
import {
  BALL_STYLE_OPTIONS,
  PREVIEW_BALLS,
  type BallStyleId,
} from "@/lib/ballStyles";

type BallStylePickerProps = {
  ballStyle: BallStyleId;
  onSelect: (id: BallStyleId) => void;
  canEdit: boolean;
  saving?: boolean;
  title?: string;
  description?: string;
};

export function BallStylePicker({
  ballStyle,
  onSelect,
  canEdit,
  saving = false,
  title = "Ball styles",
  description = "Applies to landscape, vertical, and the controller rack.",
}: BallStylePickerProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {BALL_STYLE_OPTIONS.map((opt) => {
          const active = ballStyle === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!canEdit || saving}
              onClick={() => onSelect(opt.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors disabled:opacity-60 ${
                active
                  ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{opt.description}</p>
                </div>
                {active && (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1 rounded-full border border-gray-100 bg-white/95 px-3 py-2 shadow-sm">
                {PREVIEW_BALLS.map((n) => (
                  <RackBall key={n} variant={opt.id} number={n} size={28} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
