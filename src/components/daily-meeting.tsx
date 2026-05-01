import { useEffect, useRef } from "react";

interface Props {
  url: string;
  token: string;
  onLeft?: () => void;
}

export function DailyMeeting({ url, token, onLeft }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let call: { destroy: () => void; off: (e: string, h: () => void) => void } | null = null;
    let cancelled = false;
    const handleLeft = () => onLeft?.();

    (async () => {
      const mod = await import("@daily-co/daily-js");
      if (cancelled || !containerRef.current) return;
      const DailyIframe = mod.default;
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "0",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      call = frame as unknown as typeof call;
      frame.on("left-meeting", handleLeft);
      try {
        await frame.join({ url, token });
      } catch (e) {
        console.error("Daily join error", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        call?.off("left-meeting", handleLeft);
        call?.destroy();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  return <div ref={containerRef} className="w-full h-full" />;
}
