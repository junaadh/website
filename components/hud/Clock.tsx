"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Indian/Maldives",
});

// Local time in the Maldives. Renders a placeholder on the server so the
// static HTML never disagrees with the browser.
export function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNow(fmt.format(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="tabular-nums" suppressHydrationWarning>
      {now ?? "--:--:--"}
    </time>
  );
}
