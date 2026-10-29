'use client'

// src/components/DashboardCharts.tsx
//
// Analytics charts for the admin dashboard.
// Dynamically imported (ssr:false) from admin/page.tsx.

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DashboardChartsProps {
  downloadsData: { date: string; downloads: number }[]
  courseData: { code: string; count: number }[]
  levelData: { level: string; count: number }[]
}

const PIE_COLORS = ['#1d4ed8', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b']

export default function DashboardCharts({
  downloadsData,
  courseData,
  levelData,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-8">
      {/* Downloads over time */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Downloads (last 30 days)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={downloadsData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
              itemStyle={{ color: '#1d4ed8' }}
            />
            <Line
              type="monotone"
              dataKey="downloads"
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 courses by papers */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Top 5 courses by papers
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={courseData} layout="vertical">
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="code"
              type="category"
              width={60}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
              itemStyle={{ color: '#7c3aed' }}
            />
            <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Papers by level */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Papers by level
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={levelData}
              dataKey="count"
              nameKey="level"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
            >
              {levelData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
