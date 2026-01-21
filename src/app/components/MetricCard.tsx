import React from 'react';

interface MetricCardProps {
  title: string;
  amount: number;
  color: string;
}

export function MetricCard({ title, amount, color }: MetricCardProps) {
  const formatAmount = (num: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(num);

  return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-sm text-gray-600 mb-2">{title}</h3>
        <p className="text-3xl" style={{ color }}>{formatAmount(amount)}</p>
      </div>
  );
}