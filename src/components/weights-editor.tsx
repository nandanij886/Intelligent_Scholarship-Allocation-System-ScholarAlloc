import { Slider } from "@/components/ui/slider";
import { normaliseWeights } from "@/lib/dsa";
import type { Weights } from "@/lib/types";

const KEYS: { k: keyof Weights; label: string }[] = [
  { k: "merit", label: "Merit" },
  { k: "need", label: "Need" },
  { k: "category", label: "Category bonus" },
];

export function WeightsEditor({ value, onChange }: { value: Weights; onChange: (w: Weights) => void }) {
  const n = normaliseWeights(value);
  return (
    <div className="space-y-4">
      {KEYS.map(({ k, label }) => (
        <div key={k}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium text-foreground">{label}</span>
            <span className="font-mono text-muted-foreground">
              {value[k].toFixed(2)} → {(n[k] * 100).toFixed(0)}%
            </span>
          </div>
          <Slider min={0} max={1} step={0.05} value={[value[k]]} onValueChange={([v]) => onChange({ ...value, [k]: v })} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Weights are normalised so they always add up to 100%.</p>
    </div>
  );
}
