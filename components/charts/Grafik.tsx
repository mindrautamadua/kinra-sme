'use client'

import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { bentukOpsi, type SpekGrafik, type Token } from './options'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

function bacaToken(): Token {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    s1: v('--s1'), s2: v('--s2'), s3: v('--s3'), jingga: v('--jingga'), merah: v('--merah'),
    ink: v('--ink'), ink2: v('--ink-2'), muted: v('--muted'), surface: v('--surface'),
    grid: `rgba(${v('--line-rgb')}, 0.08)`, line: `rgba(${v('--line-rgb')}, 0.14)`,
    font: getComputedStyle(document.body).fontFamily,
  }
}

export function Grafik({ spek, tinggi = 320, label }: { spek: SpekGrafik; tinggi?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Inisialisasi saat grafik masuk layar supaya animasi masuknya terlihat
    let chart: echarts.EChartsType | undefined
    const gambar = () => chart?.setOption(bentukOpsi(spek, bacaToken()), true)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      chart = echarts.init(el, undefined, { renderer: 'canvas' })
      gambar()
    })
    io.observe(el)
    const ro = new ResizeObserver(() => chart?.resize())
    ro.observe(el)
    const mo = new MutationObserver(gambar)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener('change', gambar)
    return () => { io.disconnect(); ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', gambar); chart?.dispose() }
  }, [spek])

  return <div ref={ref} role="img" aria-label={label} style={{ height: tinggi, width: '100%' }} />
}
