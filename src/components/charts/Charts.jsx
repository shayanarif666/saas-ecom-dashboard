import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/helpers';

/** BookVerse-style revenue bars — muted lavender with one highlighted navy bar */
export function RevenueChart({ data = [] }) {
  const series =
    data.length > 0
      ? data.map((d, i) => ({
          name: d.name || d.date || d._id || `M${i + 1}`,
          revenue: Number(d.revenue) || 0,
          highlight: Boolean(d.highlight) || i === data.length - 2,
        }))
      : [
          { name: 'Jan', revenue: 32000 },
          { name: 'Feb', revenue: 41000 },
          { name: 'Mar', revenue: 38000 },
          { name: 'Apr', revenue: 52000 },
          { name: 'May', revenue: 78000, highlight: true },
          { name: 'Jun', revenue: 61000 },
        ];

  return (
    <div className="h-72 w-full">
      <div className="mb-3 flex items-center gap-4 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Current Year
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-lavender" /> Previous Year
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={series} barSize={28}>
          <CartesianGrid vertical={false} stroke="#E8E7F2" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ fill: 'rgba(59,50,148,0.04)' }}
            formatter={(v) => formatCurrency(v)}
            contentStyle={{ borderRadius: 12, borderColor: '#E8E7F2' }}
          />
          <Bar dataKey="revenue" radius={[8, 8, 8, 8]}>
            {series.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.highlight ? '#1E1B4B' : '#D8D6F0'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesChart({ data = [] }) {
  const series = data.map((d) => ({
    name: d.name || 'Other',
    sales: d.sales || 0,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={series} barSize={24}>
          <CartesianGrid vertical={false} stroke="#E8E7F2" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Bar dataKey="sales" fill="#3B3294" radius={[8, 8, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
