import type { BallStyleId } from "@/lib/ballStyles";
import BroadcastFlatBall from "./BroadcastFlatBall";
import ClassicBall from "./ClassicBall";
import ProGlossBall from "./ProGlossBall";
import Set5Ball from "./Set5Ball";
import StreamEdgeBall from "./StreamEdgeBall";
import type { BallVisualProps } from "./shared";

type RackBallProps = BallVisualProps & {
  variant: BallStyleId;
};

/** One rack ball for the selected visual set. */
export default function RackBall({ variant, ...props }: RackBallProps) {
  switch (variant) {
    case "broadcast":
      return <BroadcastFlatBall {...props} />;
    case "pro_gloss":
      return <ProGlossBall {...props} />;
    case "stream_edge":
      return <StreamEdgeBall {...props} />;
    case "set_5":
      return <Set5Ball {...props} />;
    case "classic":
    default:
      return <ClassicBall {...props} />;
  }
}
