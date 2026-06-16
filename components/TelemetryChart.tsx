"use client";

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

type Series = {
  name: string;
  color: string;
  data: [number, number][];
};

type TelemetryChartProps = {
  title: string;
  unit?: string;
  series: Series[];
  stepped?: boolean;
};

export function TelemetryChart({ title, unit, series, stepped = false }: TelemetryChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const option = useMemo<EChartsCoreOption>(
    () => ({
      backgroundColor: "transparent",
      color: series.map((item) => item.color),
      animation: false,
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) => `${String(value)}${unit ? ` ${unit}` : ""}`,
        backgroundColor: "rgba(8, 11, 16, 0.95)",
        borderColor: "#263243",
        textStyle: { color: "#eef3f8" }
      },
      legend: {
        right: 8,
        top: 0,
        textStyle: { color: "#9aa6b2" },
        icon: "roundRect"
      },
      grid: { left: 42, right: 18, top: 42, bottom: 32 },
      xAxis: {
        type: "value",
        name: "s",
        nameTextStyle: { color: "#748195" },
        axisLabel: { color: "#8b96a7" },
        axisLine: { lineStyle: { color: "#263243" } },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.08)" } }
      },
      yAxis: {
        type: "value",
        name: unit,
        nameTextStyle: { color: "#748195" },
        axisLabel: { color: "#8b96a7" },
        axisLine: { lineStyle: { color: "#263243" } },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.08)" } }
      },
      series: series.map((item) => ({
        name: item.name,
        type: "line",
        showSymbol: false,
        smooth: !stepped,
        step: stepped ? "middle" : false,
        lineStyle: { width: 2 },
        data: item.data
      }))
    }),
    [series, stepped, unit]
  );

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const resize = () => chart.resize();
    chart.setOption(option);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);

  return (
    <section className="min-h-[300px] rounded-lg border border-line bg-panel/88 p-4 shadow-dash">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
      </div>
      <div ref={ref} className="h-[250px] w-full" />
    </section>
  );
}
