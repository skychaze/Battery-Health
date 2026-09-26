import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-500.css";
import { createRoot } from "react-dom/client";
import { batteryPercent, batteryState } from "../shared/battery";
import { usePublishedState } from "./published-state";
import { AlertSettings, OpenAtLoginRow, VersionRow } from "./settings-rows";
import "./styles.css";

function App() {
  const [check] = usePublishedState("batteryCheck");
  const percent = batteryPercent(check);
  return (
    <main>
      <header>
        <h1>Tether</h1>
        <div className="battery">
          <p className="level" data-hidden={percent === null}>
            {percent ?? 0}
            <span>%</span>
          </p>
          <p className="status" title={check?.ok === false ? check.error : undefined}>
            {batteryState(check)}
          </p>
        </div>
      </header>

      <div className="settings-list">
        <AlertSettings />
        <OpenAtLoginRow />
        <VersionRow />
      </div>
    </main>
  );
}

// The first frame waits for the bundled faces, since drawing it in a fallback face reflows the page a
// frame later.
await Promise.all(["1em 'Inter Tight Variable'", "500 1em Newsreader"].map((font) => document.fonts.load(font)));
createRoot(document.getElementById("root")!).render(<App />);
