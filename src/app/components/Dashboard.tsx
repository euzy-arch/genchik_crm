import React, { useState, useEffect } from 'react';
import { MetricCard } from './MetricCard';
import { AIChat } from './AIChat';
import { Analytics } from './Analytics';
import financeService from '../../services/financeService';
import { AIAnalyticsPanel } from './AIAnalyticsPanel';

export function Dashboard() {
    const [metrics, setMetrics] = useState({ income: 0, expenses: 0, profit: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    const [refreshAnalytics, setRefreshAnalytics] = useState(0);

    const handleAnalysisGenerated = () => {
        setRefreshAnalytics(prev => prev + 1);
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const summaryResponse = await financeService.getSummary();
            if (summaryResponse.success && summaryResponse.data) {
                const summaryData = summaryResponse.data;
                setSummary(summaryData);
                setMetrics({
                    income: summaryData.total_income || 0,
                    expenses: summaryData.total_expense || 0,
                    profit: summaryData.balance || 0,
                });
            }
        } catch (err) {
            console.error('Ошибка загрузки данных дашборда:', err);
            setError('Не удалось загрузить данные. Проверьте подключение к серверу.');
            setMetrics({ income: 0, expenses: 0, profit: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const handleRefresh = () => loadDashboardData();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                            <div className="animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="text-red-500 mr-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-red-800 font-medium">Ошибка загрузки данных</h3>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                    <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">Попробовать снова</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard title="Доходы" amount={0} color="#10B981" />
                    <MetricCard title="Расходы" amount={0} color="#EF4444" />
                    <MetricCard title="Прибыль" amount={0} color="#3B82F6" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                    <AIChat />
                    <Analytics />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
                <div className="flex items-center space-x-4">
                    {summary && summary.last_operation_date && (
                        <span className="text-sm text-gray-500">Данные обновлены: {new Date(summary.last_operation_date).toLocaleDateString('ru-RU')}</span>
                    )}
                    <button onClick={handleRefresh} className="flex items-center text-sm text-blue-500 hover:text-blue-700">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Обновить
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Доходы" amount={metrics.income} color="#10B981" subtitle={summary ? `${summary.income_count || 0} операций` : ''} />
                <MetricCard title="Расходы" amount={metrics.expenses} color="#EF4444" subtitle={summary ? `${summary.expense_count || 0} операций` : ''} />
                <MetricCard title="Прибыль" amount={metrics.profit} color={metrics.profit >= 0 ? "#3B82F6" : "#EF4444"} subtitle={summary ? `Баланс: ${summary.balance?.toLocaleString('ru-RU') || 0} ₽` : ''} />
            </div>

            {summary && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Дополнительная статистика</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Первая операция</div>
                            <div className="text-sm font-medium">{summary.first_operation_date ? new Date(summary.first_operation_date).toLocaleDateString('ru-RU') : 'Нет данных'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Последняя операция</div>
                            <div className="text-sm font-medium">{summary.last_operation_date ? new Date(summary.last_operation_date).toLocaleDateString('ru-RU') : 'Нет данных'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Всего операций</div>
                            <div className="text-sm font-medium">{(summary.income_count || 0) + (summary.expense_count || 0)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Средний доход</div>
                            <div className="text-sm font-medium">{summary.income_count ? `${Math.round((summary.total_income || 0) / summary.income_count).toLocaleString('ru-RU')} ₽` : '0 ₽'}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[1000px]">
                <AIChat onAnalysisGenerated={handleAnalysisGenerated}/>
                <Analytics/>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6">
                    <AIAnalyticsPanel key={refreshAnalytics} />
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Данные загружены из базы данных в реальном времени</span>
                </div>
            </div>
        </div>
    );
}