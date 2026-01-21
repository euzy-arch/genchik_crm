import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import financeService from '../../services/financeService';

export function Analytics() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [expenseStructure, setExpenseStructure] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasRealData, setHasRealData] = useState(false);

  const loadRealData = async () => {
    try {
      setLoading(true);

      const statsResponse = await financeService.getStatistics('month');

      if (statsResponse.success && statsResponse.data) {
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

        const formattedData = statsResponse.data.slice(0, 6).map((item) => {
          let monthName = 'Неизв';
          if (item.period && item.period.includes('-')) {
            const [year, month] = item.period.split('-');
            const monthNum = parseInt(month);
            if (monthNum >= 1 && monthNum <= 12) monthName = monthNames[monthNum - 1];
          }

          return {
            month: monthName,
            income: item.total_income || 0,
            expenses: item.total_expense || 0,
            rawPeriod: item.period
          };
        }).reverse();

        setMonthlyData(formattedData);
        setHasRealData(true);
      }

      const categoriesResponse = await financeService.getExpensesByCategory();

      if (categoriesResponse.success && categoriesResponse.data) {
        const categoriesWithData = categoriesResponse.data.filter(item => {
          const amount = item.total_amount || item.value || item.amount || 0;
          return amount > 0;
        });

        if (categoriesWithData.length > 0) {
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

          const formattedCategories = categoriesWithData.map((item, index) => ({
            name: item.name || `Категория ${index + 1}`,
            value: item.total_amount || item.value || item.amount || 0,
            color: colors[index % colors.length],
            operations_count: item.operations_count || 1
          }));

          setExpenseStructure(formattedCategories);
          setHasRealData(true);
        }
      }

    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  const formatCurrency = (value) => `${value.toLocaleString('ru-RU')} ₽`;
  const formatCurrencyK = (value) => `${(value / 1000).toFixed(0)}k ₽`;

  return (
      <div className="bg-white rounded-lg shadow-sm h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg">Аналитика</h2>
          {hasRealData && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Реальные данные</span>}
        </div>

        {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Загрузка данных...</p>
              </div>
            </div>
        ) : (
            <div className="space-y-8 flex-1">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm text-gray-600">Доходы vs Расходы по месяцам</h3>
                  {!hasRealData && <button onClick={loadRealData} className="text-xs text-blue-500 hover:text-blue-700">Загрузить реальные данные</button>}
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }} formatter={(value) => [formatCurrency(value), value > 0 ? 'Доходы' : 'Расходы']} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#10B981" name="Доходы" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#EF4444" name="Расходы" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm text-gray-600">Структура расходов</h3>
                  {!hasRealData && expenseStructure.length === 0 && <span className="text-xs text-gray-500">Нет данных о расходах</span>}
                </div>

                {expenseStructure.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={expenseStructure} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                          {expenseStructure.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }} formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[250px] border-2 border-dashed border-gray-200 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500">Нет данных о расходах</p>
                        <p className="text-sm text-gray-400 mt-1">Добавьте операции расходов с категориями</p>
                      </div>
                    </div>
                )}
              </div>

              {hasRealData && monthlyData.length > 0 && (
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm text-gray-600 mb-3">Общая статистика</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-semibold text-green-600">{formatCurrencyK(monthlyData.reduce((sum, item) => sum + item.income, 0))}</div>
                        <div className="text-xs text-gray-600 mt-1">Общий доход</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-semibold text-red-600">{formatCurrencyK(monthlyData.reduce((sum, item) => sum + item.expenses, 0))}</div>
                        <div className="text-xs text-gray-600 mt-1">Общий расход</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-semibold text-blue-600">{formatCurrencyK(monthlyData.reduce((sum, item) => sum + item.income, 0) - monthlyData.reduce((sum, item) => sum + item.expenses, 0))}</div>
                        <div className="text-xs text-gray-600 mt-1">Общий баланс</div>
                      </div>
                    </div>
                  </div>
              )}
            </div>
        )}

        <div className="pt-4 mt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500">{hasRealData ? 'Данные загружены из базы данных' : 'Используются демонстрационные данные. Добавьте операции в систему для отображения реальной статистики.'}</p>
        </div>
      </div>
  );
}