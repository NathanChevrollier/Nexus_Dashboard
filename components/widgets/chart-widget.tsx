"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Settings, Save, X, BarChart3, PieChart, LineChart, Activity } from "lucide-react";
import { Widget } from "@/lib/db/schema";
import { updateWidget } from "@/lib/actions/widgets";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

// Enregistrement des composants ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartWidgetProps {
  widget: Widget;
}

type ChartType = "bar" | "line" | "pie" | "doughnut" | "area";

// Palette de couleurs moderne
const COLORS = [
  "rgba(59, 130, 246, 0.8)",   // Blue
  "rgba(16, 185, 129, 0.8)",   // Emerald
  "rgba(245, 158, 11, 0.8)",   // Amber
  "rgba(239, 68, 68, 0.8)",    // Red
  "rgba(139, 92, 246, 0.8)",   // Violet
  "rgba(236, 72, 153, 0.8)",   // Pink
  "rgba(6, 182, 212, 0.8)",    // Cyan
];

export function ChartWidget({ widget }: ChartWidgetProps) {
  const chartRef = useRef<any>(null); // Référence pour créer des gradients
  
  // Parsing sécurisé des options
  const options = widget.options as {
    title?: string;
    chartType?: ChartType;
    labels?: string[];
    values?: number[];
    dataSourceUrl?: string;
    pollInterval?: number;
  };

  // --- STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(options.title || "Statistiques");
  const [localType, setLocalType] = useState<ChartType>(options.chartType || "bar");
  const [labelsInput, setLabelsInput] = useState<string>((options.labels || []).join(", "));
  const [valuesInput, setValuesInput] = useState<string>((options.values || []).join(", "));
  const [dataSourceUrl, setDataSourceUrl] = useState<string>(options.dataSourceUrl || "");
  const [pollInterval, setPollInterval] = useState<number>(options.pollInterval || 0);
  const [error, setError] = useState<string | null>(null);

  // Runtime data (fetched)
  const [runtimeLabels, setRuntimeLabels] = useState<string[] | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<number[] | null>(null);

  // --- DATA PROCESSING (Memoized) ---
  const { chartData, stats, trend } = useMemo(() => {
    // Fallback data si vide
    const labels = (runtimeLabels && runtimeLabels.length) ? runtimeLabels : (options.labels?.length ? options.labels : ["Lun", "Mar", "Mer", "Jeu", "Ven"]);
    const values = (runtimeValues && runtimeValues.length) ? runtimeValues : (options.values?.length ? options.values : [10, 25, 45, 30, 55]);

    // Stats
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length ? sum / values.length : 0;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Tendance (compare le dernier point au premier)
    const isUp = values.length > 1 ? values[values.length - 1] >= values[0] : true;
    const trendDiff = values.length > 1 ? Math.abs(values[values.length - 1] - values[0]) : 0;

    // Configuration ChartJS
    const data = {
      labels,
      datasets: [
        {
          label: localTitle,
          data: values,
          borderWidth: 2,
          tension: 0.4, // Courbe lissée
          pointRadius: 4,
          pointHoverRadius: 6,
          // Gestion dynamique des couleurs selon le type
          backgroundColor: (context: ScriptableContext<"line">) => {
            const type = localType; // Utilise le type local (même en preview avant save)
            
            // Logique pour le dégradé "Area"
            if (type === "area") {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, "rgba(59, 130, 246, 0.5)");
              gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
              return gradient;
            }
            if (type === "line") return "rgba(59, 130, 246, 0.1)";
            // Pour Pie/Doughnut/Bar, on retourne le tableau de couleurs
            return labels.map((_, i) => COLORS[i % COLORS.length]);
          },
          borderColor: (context: ScriptableContext<"line">) => {
             const type = localType;
             if (type === "line" || type === "area") return "rgb(59, 130, 246)"; // Bleu uni pour les lignes
             // Bordures légèrement plus opaques pour les barres/camemberts
             return labels.map((_, i) => COLORS[i % COLORS.length].replace("0.8", "1"));
          },
          fill: localType === "area", // Active le remplissage pour "Area"
        },
      ],
    };

    return { 
      chartData: data, 
      stats: { avg, min, max }, 
      trend: { isUp, diff: trendDiff } 
    };
  }, [options.labels, options.values, localType, localTitle, runtimeLabels, runtimeValues]); // Dépendances strictes

  // --- ACTIONS ---

  const handleSave = async () => {
    setError(null);
    const cleanLabels = labelsInput.split(",").map((l) => l.trim()).filter(Boolean);
    const cleanValues = valuesInput.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));

    if (cleanLabels.length === 0 || cleanValues.length === 0) {
      setError("Les données ne peuvent pas être vides.");
      return;
    }
    if (cleanLabels.length !== cleanValues.length) {
      setError(`Décalage : ${cleanLabels.length} labels pour ${cleanValues.length} valeurs.`);
      return;
    }

    try {
      await updateWidget(widget.id, {
        options: {
          ...widget.options,
          title: localTitle,
          chartType: localType,
          labels: cleanLabels,
          values: cleanValues,
          dataSourceUrl: dataSourceUrl || undefined,
          pollInterval: pollInterval || undefined,
        },
      });
      setIsEditing(false);
    } catch (e) {
      setError("Erreur lors de la sauvegarde.");
    }
  };

  const handleCancel = () => {
    // Reset aux valeurs originales
    setLocalTitle(options.title || "Statistiques");
    setLocalType(options.chartType || "bar");
    setLabelsInput((options.labels || []).join(", "));
    setValuesInput((options.values || []).join(", "));
    setDataSourceUrl(options.dataSourceUrl || "");
    setPollInterval(options.pollInterval || 0);
    setIsEditing(false);
    setError(null);
  };

  // Fetch runtime data from configured data source
  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    async function fetchOnce() {
      if (!dataSourceUrl) return;
      controller = new AbortController();
      try {
        const res = await fetch(dataSourceUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // Try to parse common shapes
        if (Array.isArray(json)) {
          // array of numbers or objects
          if (json.every(i => typeof i === 'number')) {
            if (!mounted) return;
            setRuntimeLabels(json.map((_, i) => `#${i+1}`));
            setRuntimeValues(json as number[]);
            return;
          }
          if (json.every(i => typeof i === 'object' && i !== null)) {
            // attempt to extract label/value pairs
            const keys = Object.keys(json[0] || {});
            const possibleLabel = keys.find(k => /label|name|key|date/i.test(k));
            const possibleValue = keys.find(k => /value|count|amount|y|v|score/i.test(k));
            if (possibleLabel && possibleValue) {
              if (!mounted) return;
              setRuntimeLabels(json.map((it: any) => String(it[possibleLabel])));
              setRuntimeValues(json.map((it: any) => Number(it[possibleValue] || 0)));
              return;
            }
          }
        }

        if (json && typeof json === 'object') {
          if (Array.isArray(json.labels) && Array.isArray(json.values)) {
            if (!mounted) return;
            setRuntimeLabels(json.labels.map((l: any) => String(l)));
            setRuntimeValues(json.values.map((v: any) => Number(v || 0)));
            return;
          }
          // object of key:number
          const entries = Object.entries(json).filter(([, v]) => typeof v === 'number');
          if (entries.length) {
            if (!mounted) return;
            setRuntimeLabels(entries.map(e => String(e[0])));
            setRuntimeValues(entries.map(e => Number(e[1])));
            return;
          }
        }

        // fallback: clear runtime
        if (mounted) {
          setRuntimeLabels(null);
          setRuntimeValues(null);
        }
      } catch (e) {
        if (mounted) {
          console.warn('ChartWidget fetch error', e);
          setRuntimeLabels(null);
          setRuntimeValues(null);
        }
      }
    }

    // initial fetch
    fetchOnce();
    // polling
    let intervalId: any;
    if (pollInterval && pollInterval > 0 && dataSourceUrl) {
      intervalId = setInterval(fetchOnce, pollInterval * 1000);
    }

    return () => {
      mounted = false;
      if (controller) controller.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [dataSourceUrl, pollInterval]);

  // --- RENDER CONFIG ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: ["pie", "doughnut"].includes(localType),
        position: "bottom" as const,
        labels: { boxWidth: 10, padding: 10, font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        padding: 10,
        cornerRadius: 8,
        displayColors: false, // Cache le carré de couleur dans le tooltip
        callbacks: {
            label: function(context: any) {
                return `${context.dataset.label}: ${context.parsed.y !== undefined ? context.parsed.y : context.parsed}`;
            }
        }
      },
    },
    scales: ["pie", "doughnut"].includes(localType) ? undefined : {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { 
        beginAtZero: true, 
        grid: { color: "rgba(107, 114, 128, 0.1)", borderDash: [4, 4] }, // Grille en pointillés
        ticks: { font: { size: 10 } } 
      },
    },
  };

  return (
    <div className="flex flex-col h-full p-4 relative group">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 bg-primary/10 rounded-md text-primary">
             {localType === 'pie' || localType === 'doughnut' ? <PieChart className="w-4 h-4"/> : 
              localType === 'line' || localType === 'area' ? <Activity className="w-4 h-4"/> : 
              <BarChart3 className="w-4 h-4"/>}
          </div>
          <h3 className="font-semibold text-sm truncate" title={localTitle}>
            {localTitle}
          </h3>
        </div>

        {/* Bouton Edit (visible au survol ou si editing) */}
        <div className={`flex items-center gap-1 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
           {!isEditing && (
             <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors">
               <Settings className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {/* MODE ÉDITION */}
      {isEditing ? (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-20 p-4 flex flex-col gap-3 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Configuration</h4>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
          </div>
          
          <div className="space-y-3 flex-1">
            <div>
              <label className="text-xs font-medium mb-1 block">Titre</label>
              <input 
                className="w-full text-xs p-2 rounded border bg-background" 
                value={localTitle} 
                onChange={e => setLocalTitle(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="text-xs font-medium mb-1 block">Type</label>
              <div className="grid grid-cols-5 gap-1">
                {(['bar', 'line', 'area', 'pie', 'doughnut'] as ChartType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setLocalType(t)}
                    className={`text-[10px] py-1 rounded border capitalize ${localType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Labels (CSV)</label>
              <textarea 
                className="w-full text-xs p-2 rounded border bg-background resize-none h-16 font-mono" 
                value={labelsInput} 
                onChange={e => setLabelsInput(e.target.value)} 
                placeholder="Jan, Fév, Mar..."
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Valeurs (CSV)</label>
              <textarea 
                className="w-full text-xs p-2 rounded border bg-background resize-none h-16 font-mono" 
                value={valuesInput} 
                onChange={e => setValuesInput(e.target.value)} 
                placeholder="10, 20, 30..."
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Source de données (URL JSON)</label>
              <input
                className="w-full text-xs p-2 rounded border bg-background"
                value={dataSourceUrl}
                onChange={e => setDataSourceUrl(e.target.value)}
                placeholder="https://api.example.com/metrics"
              />
              <p className="text-xs text-muted-foreground mt-1">Format attendu JSON simple: {`{ labels: [...], values: [...] }`} ou un tableau de nombres.</p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Intervalle de rafraîchissement (sec, 0 = désactivé)</label>
              <input
                type="number"
                min={0}
                className="w-32 text-xs p-2 rounded border bg-background"
                value={pollInterval}
                onChange={e => setPollInterval(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <div className="text-[10px] text-red-500 font-medium">{error}</div>}

          <button 
            onClick={handleSave} 
            className="w-full py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Save className="w-3 h-3" /> Sauvegarder
          </button>
        </div>
      ) : (
        /* MODE AFFICHAGE */
        <>
          <div className="flex-1 min-h-0 relative">
            {/* On utilise localType ici pour permettre la preview instantanée si on changeait la logique */}
            {localType === "line" || localType === "area" ? <Line ref={chartRef} data={chartData as any} options={chartOptions as any} /> :
             localType === "pie" ? <Pie ref={chartRef} data={chartData as any} options={chartOptions as any} /> :
             localType === "doughnut" ? <Doughnut ref={chartRef} data={chartData as any} options={chartOptions as any} /> :
             <Bar ref={chartRef} data={chartData as any} options={chartOptions as any} />}
          </div>

          {/* FOOTER STATS (Uniquement pour graphiques non circulaires) */}
          {!["pie", "doughnut"].includes(localType) && (
            <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-3">
                <span title="Moyenne">x̄ {stats.avg.toFixed(1)}</span>
                <span title="Maximum" className="text-green-600/80">↑ {stats.max}</span>
              </div>
              
              <div className={`flex items-center gap-1 font-medium ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trend.diff.toFixed(1)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}