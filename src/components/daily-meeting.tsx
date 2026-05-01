import { useEffect, useRef } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

interface Props {
  url: string;
  token: string;
  onLeft?: () => void;
}

export function DailyMeeting({ url, token, onLeft }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const call = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "0",
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });
    callRef.current = call;
    call.join({ url, token }).catch((e) => console.error("Daily join error", e));
    const handleLeft = () => onLeft?.();
    call.on("left-meeting", handleLeft);
    return () => {
      call.off("left-meeting", handleLeft);
      call.destroy();
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  return <div ref={containerRef} className="w-full h-full" />;
}
