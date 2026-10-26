import type { EChartsCoreOption } from 'echarts/core'

export type Token = { s1: string; s2: string; s3: string; ink: string; ink2: string; muted: string; grid: string; surface: string; line: string; font: string; jingga: string; merah: string }

export type Seri = { nama: string; data: (number | null)[]; warna?: 's1' | 's2' | 's3' | 'jingga' | 'merah'; putus?: boolean; tumpuk?: string }

export type SpekGrafik =
  | { jenis: 'batang'; kategori: string[]; seri: Seri[]; satuan?: string; horizontal?: boolean }
  | { jenis: 'garis'; kategori: string[]; seri: Seri[]; satuan?: string }
  | { jenis: 'donat'; data: { nama: string; nilai: number; warna?: Seri['warna'] }[]; satuan?: string; tengah?: string }

const fmt = (v: number, d = 1) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(v)

function dasar(T: Token, satuan?: string) {
  return {
    textStyle: { fontFamily: T.font, color: T.ink2 },
    animationDuration: 900,
    animationEasing: 'cubicOut' as const,
    tooltip: {
      trigger: 'axis',
      backgroundColor: T.surface,
      borderColor: T.line,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: T.ink, fontFamily: T.font, fontSize: 12 },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);',
      valueFormatter: (v: unknown) => (typeof v === 'number' ? `${fmt(v, 2)}${satuan ? ` ${satuan}` : ''}` : '–'),
    },
    legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 4, textStyle: { color: T.ink2, fontSize: 12 } },
    grid: { left: 8, right: 12, top: 36, bottom: 4, containLabel: true },
  }
}

const sumbu = (T: Token) => ({
  axisLine: { show: false }, axisTick: { show: false },
  axisLabel: { color: T.muted, fontSize: 11 },
  splitLine: { lineStyle: { color: T.grid } },
})

export function bentukOpsi(s: SpekGrafik, T: Token): EChartsCoreOption {
  const warna = (w?: Seri['warna']) => T[w ?? 's1']
  if (s.jenis === 'donat') {
    const b = dasar(T, s.satuan)
    return {
      ...b,
      tooltip: { ...b.tooltip, trigger: 'item' },
      legend: { ...b.legend, top: 'auto', bottom: 0, right: 'center' },
      series: [{
        type: 'pie', radius: ['52%', '74%'], center: ['50%', '45%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 4 },
        label: s.tengah ? { show: true, position: 'center', formatter: s.tengah, color: T.ink, fontSize: 15, fontWeight: 600, fontFamily: T.font } : { show: false },
        emphasis: { scale: false },
        data: s.data.map((d) => ({ name: d.nama, value: d.nilai, itemStyle: { color: warna(d.warna) } })),
      }],
    }
  }
  const kat = { type: 'category', data: s.kategori, ...sumbu(T), splitLine: { show: false } }
  const nil = { type: 'value', ...sumbu(T), axisLabel: { color: T.muted, fontSize: 11, formatter: (v: number) => fmt(v, 1) } }
  const horizontal = s.jenis === 'batang' && s.horizontal
  return {
    ...dasar(T, s.satuan),
    xAxis: horizontal ? nil : kat,
    yAxis: horizontal ? { ...kat, inverse: true } : nil,
    series: s.seri.map((x) => s.jenis === 'batang'
      ? { name: x.nama, type: 'bar', stack: x.tumpuk, data: x.data, barMaxWidth: 26, itemStyle: { color: warna(x.warna), borderRadius: x.tumpuk ? 0 : [4, 4, 0, 0] } }
      : {
          name: x.nama, type: 'line', data: x.data, smooth: 0.25, connectNulls: false, symbol: 'circle', symbolSize: 7,
          lineStyle: { color: warna(x.warna), width: 2, type: x.putus ? 'dashed' : 'solid' },
          itemStyle: { color: warna(x.warna), borderColor: T.surface, borderWidth: 2 },
        }),
  }
}
