import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, FileText, Download, AlertCircle, Zap, Trash2 } from 'lucide-react';
import financeService from '../../services/financeService';

interface AIAnalysis {
    id: number;
    analysis_type: string;
    period_start: string;
    period_end: string;
    content: any;
    summary: string;
    insights: any;
    created_at: string;
}

export function AIAnalyticsPanel() {
    const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'economy' | 'reports'>('all');

    useEffect(() => {
        loadAnalyses();
    }, []);

    const loadAnalyses = async () => {
        try {
            setLoading(true);
            const response = await financeService.request('/ai/analyses');
            if (response.success && response.data) setAnalyses(response.data);
        } catch (error) {
            console.error('Ошибка загрузки анализов:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAnalysisIcon = (type: string) => {
        switch (type) {
            case 'economy_tips': return <TrendingUp className="w-5 h-5" />;
            case 'quarter_report': return <FileText className="w-5 h-5" />;
            case 'forecast': return <AlertCircle className="w-5 h-5" />;
            default: return <Calendar className="w-5 h-5" />;
        }
    };

    const getAnalysisTypeLabel = (type: string) => {
        switch (type) {
            case 'economy_tips': return 'Советы';
            case 'quarter_report': return 'Отчет';
            case 'forecast': return 'Прогноз';
            default: return 'Анализ';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getFilteredAnalyses = () => {
        if (activeTab === 'all') return analyses;
        if (activeTab === 'economy') return analyses.filter(a => a.analysis_type === 'economy_tips');
        if (activeTab === 'reports') return analyses.filter(a => a.analysis_type === 'quarter_report');
        return analyses;
    };

    const deleteAnalysis = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот анализ?')) return;

        try {
            const response = await financeService.request(`/ai/analyses/${id}`, { method: 'DELETE' });
            if (response.success) {
                alert('Анализ успешно удален');
                loadAnalyses();
            } else {
                alert('Не удалось удалить анализ: ' + response.message);
            }
        } catch (error) {
            console.error('Ошибка удаления анализа:', error);
            alert('Ошибка при удалении анализа');
        }
    };

    const deleteAllAnalyses = async (type: string) => {
        const typeName = type === 'economy_tips' ? 'советы' : type === 'quarter_report' ? 'отчеты' : 'анализы';
        if (!window.confirm(`Вы уверены, что хотите удалить все ${typeName}?`)) return;

        try {
            const response = await financeService.request(`/ai/analyses/type/${type}`, { method: 'DELETE' });
            if (response.success) {
                alert(response.message);
                loadAnalyses();
            } else {
                alert('Не удалось удалить анализы');
            }
        } catch (error) {
            console.error('Ошибка удаления анализов:', error);
            alert('Ошибка при удалении анализов');
        }
    };

    const downloadAnalysis = (analysis: AIAnalysis) => {
        const content = `
================================
ФИНАНСОВЫЙ АНАЛИЗ
================================
Тип: ${getAnalysisTypeLabel(analysis.analysis_type)}
Период: ${formatDate(analysis.period_start)} - ${formatDate(analysis.period_end)}
Создан: ${formatDate(analysis.created_at)}
Сводка: ${analysis.summary}

${analysis.content?.analysis || analysis.content?.report || analysis.content?.forecast || 'Нет содержимого'}

${analysis.insights?.criticalCategories ? `\nКлючевые категории:\n${analysis.insights.criticalCategories.map((cat: string) => `• ${cat}`).join('\n')}` : ''}
================================
    `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `анализ_${analysis.analysis_type}_${analysis.period_start.replace(/-/g, '')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const generateNewAnalysis = async (type: 'economy' | 'quarter' | 'forecast') => {
        try {
            let endpoint = '';
            let method = 'GET';

            switch (type) {
                case 'economy':
                    endpoint = '/ai/analyze-economy';
                    method = 'POST';
                    break;
                case 'quarter':
                    endpoint = '/ai/quarter-report';
                    break;
                case 'forecast':
                    endpoint = '/ai/forecast';
                    break;
            }

            const response = await financeService.request(endpoint, { method });
            if (response.success) {
                alert('Анализ успешно создан!');
                loadAnalyses();
            }
        } catch (error) {
            console.error('Ошибка создания анализа:', error);
            alert('Не удалось создать анализ');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">AI Аналитика</h3>
                        <p className="text-sm text-gray-600">Сохраненные отчеты и анализы</p>
                    </div>
                    <button onClick={() => generateNewAnalysis('economy')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        Новый анализ
                    </button>
                </div>

                <div className="flex space-x-4 border-b border-gray-200">
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Все анализы
                    </button>
                    <button onClick={() => setActiveTab('economy')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'economy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Советы
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Отчеты
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {getFilteredAnalyses().length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="text-gray-400 mb-4"><FileText className="w-12 h-12 mx-auto" /></div>
                        <p className="text-gray-600 mb-2">Анализы еще не созданы</p>
                        <p className="text-sm text-gray-500">Используйте кнопку "Новый анализ" или AI помощника</p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            <button onClick={() => generateNewAnalysis('economy')} className="px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded hover:bg-blue-100">Анализ экономии</button>
                            <button onClick={() => generateNewAnalysis('quarter')} className="px-3 py-2 bg-green-50 text-green-700 text-sm rounded hover:bg-green-100">Квартальный отчет</button>
                            <button onClick={() => generateNewAnalysis('forecast')} className="px-3 py-2 bg-purple-50 text-purple-700 text-sm rounded hover:bg-purple-100">Прогноз</button>
                        </div>
                    </div>
                ) : (
                    getFilteredAnalyses().map((analysis) => (
                        <div key={analysis.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        {getAnalysisIcon(analysis.analysis_type)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{analysis.summary}</h4>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(analysis.period_start)} - {formatDate(analysis.period_end)}
                      </span>
                                            <span className="px-2 py-1 bg-gray-100 rounded">{getAnalysisTypeLabel(analysis.analysis_type)}</span>
                                            <span>{formatDate(analysis.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setSelectedAnalysis(analysis)} className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 hover:bg-blue-50 rounded">Просмотр</button>
                                    <button onClick={() => downloadAnalysis(analysis)} className="p-2 hover:bg-gray-100 rounded" title="Скачать"><Download className="w-4 h-4 text-gray-500"/></button>
                                    <button onClick={() => deleteAnalysis(analysis.id)} className="p-2 hover:bg-red-50 rounded text-red-500 hover:text-red-700" title="Удалить"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>

                            {analysis.insights?.criticalCategories && (
                                <div className="mt-3">
                                    <div className="text-xs text-gray-500 mb-1">Ключевые категории:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analysis.insights.criticalCategories.map((cat: string, idx: number) => (
                                            <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">{cat}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {selectedAnalysis && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-semibold">{selectedAnalysis.summary}</h3>
                                <p className="text-sm text-gray-600">{formatDate(selectedAnalysis.period_start)} - {formatDate(selectedAnalysis.period_end)}</p>
                            </div>
                            <button onClick={() => setSelectedAnalysis(null)} className="p-2 hover:bg-gray-100 rounded">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {selectedAnalysis.content?.analysis || selectedAnalysis.content?.report || selectedAnalysis.content?.forecast || 'Нет содержимого'}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-sm text-gray-500">Создан: {formatDate(selectedAnalysis.created_at)}</span>
                            <div className="flex space-x-2">
                                <button onClick={() => setSelectedAnalysis(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Закрыть</button>
                                <button onClick={() => downloadAnalysis(selectedAnalysis)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                                    <Download className="w-4 h-4 mr-2" />Скачать отчет
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}