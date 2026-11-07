import { useTheme } from "../lib/store";

export default function ThemeChooser() {
  const { theme, setTheme } = useTheme();
  const options = [
    { key: "light", label: "White", hint: "Bright & warm", swatch: "#fdfbf7", ink: "#111827" },
    { key: "dark", label: "Dark", hint: "Easy on the eyes", swatch: "#1c1917", ink: "#f5f5f4" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => setTheme(o.key)}
          className={`flex items-center gap-3 rounded-3xl border p-4 text-left transition ${
            theme === o.key ? "border-accent ring-2 ring-accent/20" : "border-line-strong hover:border-faint"
          }`}
        >
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl border border-line-strong font-extrabold"
            style={{ background: o.swatch, color: o.ink }}
          >
            A
          </span>
          <div className="flex-1">
            <p className="font-bold text-ink">{o.label}</p>
            <p className="text-xs text-muted">{o.hint}</p>
          </div>
          {theme === o.key && <span className="text-accent">✓</span>}
        </button>
      ))}
    </div>
  );
}
