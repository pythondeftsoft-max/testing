import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts'

interface RevenueBarData {
  name: string
  value: number
  color: string
  category?: 'rental' | 'fees' | 'deposits' | 'other'
  trend?: number
}

interface RevenueSourcesBarChartProps {
  data: RevenueBarData[]
  total: number
  height?: number
}

const RevenueSourcesBarChart: React.FC<RevenueSourcesBarChartProps> = ({
  data,
  total,
  height = 180
}) => {
  // attach percentage for tooltip if needed
  const formatted = data.map((d) => ({
    ...d,
    percentage: total > 0 ? (d.value / total) * 100 : 0
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 10, right: 15, left: 15, bottom: 10 }}
      >
        {/* hide X axis but set domain 0→total so bars fill proportionally */}
        <XAxis type="number" domain={[0, total]} hide />
        {/* show category names on Y */}
        <YAxis
          dataKey="name"
          type="category"
          width={100}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `$${value.toLocaleString()}`,
            'Revenue'
          ]}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="value" barSize={14} isAnimationActive animationDuration={600}>
          {formatted.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default RevenueSourcesBarChart