"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Widget } from "@/lib/db/schema";
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
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

// Register ChartJS components
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

interface DataPoint {
  label: string;
  value: number;
}

type ChartType = "bar" | "line" | "pie" | "doughnut" | "area";

export function ChartWidget({ widget }: ChartWidgetProps) {
  const options = widget.options as { 
    title?: string; 
    chartType?: ChartType;
    labels?: string[];
    values?: number[];
  };
  
  const [data, setData] = useState<DataPoint[]>([]);
  const chartType = options.chartType || "bar";

  useEffect(() => {
    // Utiliser les données fournies ou générer des données de demo
    if (options.labels && options.values) {
      const chartData = options.labels.map((label, i) => ({
        label,
        value: options.values![i] || 0,
      }));
      setData(chartData);
    } else {
      // Simuler des données
      const generateData = () => {
        const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        return labels.map(label => ({
          label,
          value: Math.random() * 100,
        }));
      };
      setData(generateData());
    }
  }, [options.labels, options.values]);

  const trend = data.length > 1 ? data[data.length - 1].value > data[0].value : true;
  const trendValue = Math.abs((data[data.length - 1]?.value || 0) - (data[0]?.value || 0));

  // Chart.js data configuration
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: options.title || "Données",
        data: data.map(d => d.value),
        backgroundColor: chartType === "line" || chartType === "area" 
          ? "rgba(59, 130, 246, 0.1)"
          : [
              "rgba(59, 130, 246, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(251, 191, 36, 0.8)",
              "rgba(239, 68, 68, 0.8)",
              "rgba(139, 92, 246, 0.8)",
              "rgba(236, 72, 153, 0.8)",
              "rgba(14, 165, 233, 0.8)",
            ],
        borderColor: chartType === "line" || chartType === "area"
          ? "rgb(59, 130, 246)"
          : "rgba(255, 255, 255, 0.2)",
        borderWidth: 2,
        fill: chartType === "area",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartType === "pie" || chartType === "doughnut",
        position: "bottom" as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 10 },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 8,
        cornerRadius: 6,
      },
    },
    scales: chartType !== "pie" && chartType !== "doughnut" ? {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(156, 163, 175, 0.1)",
        },
        ticks: {
          font: { size: 10 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
        },
      },
    } : undefined,
  };

  const renderChart = () => {
    switch (chartType) {
      case "line":
      case "area":
        return <Line data={chartData} options={chartOptions} />;
      case "pie":
        return <Pie data={chartData} options={chartOptions} />;
      case "doughnut":
        return <Doughnut data={chartData} options={chartOptions} />;
      case "bar":
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">{options.title || "📊 Statistiques"}</div>
        {(chartType === "line" || chartType === "area" || chartType === "bar") && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            trend ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
          }`}>
            {trend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendValue.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>

      {(chartType === "line" || chartType === "area" || chartType === "bar") && (
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground border-t pt-2">
          <span>Moy: {(data.reduce((acc, d) => acc + d.value, 0) / data.length).toFixed(1)}</span>
          <span>Max: {Math.max(...data.map(d => d.value)).toFixed(1)}</span>
          <span>Min: {Math.min(...data.map(d => d.value)).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
