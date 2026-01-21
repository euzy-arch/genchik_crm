import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, TrendingUp, PieChart, Lightbulb, Trash2 } from 'lucide-react';
import financeService from '../../services/financeService';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
}

interface AIChatProps {
  onAnalysisGenerated?: (type: string, content: string) => void;
}

const CHAT_STORAGE_KEY = 'ai_chat_history';

export function AIChat({ onAnalysisGenerated }: AIChatProps) {
  const loadMessagesFromStorage = (): Message[] => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }

    return [{
      id: 1,
      text: 'Привет! Я ваш финансовый помощник. Могу помочь проанализировать расходы, дать советы по экономии или сделать прогноз.',
      sender: 'ai',
      timestamp: new Date()
    }];
  };

  const saveMessagesToStorage = (messages: Message[]) => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Ошибка сохранения истории:', error);
    }
  };

  const [messages, setMessages] = useState<Message[]>(loadMessagesFromStorage());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    try {
      const response = await financeService.request('/ai/refresh-data', { method: 'POST' });
      if (response.success) addMessage('Данные обновлены! Теперь AI может анализировать актуальную информацию.', 'ai');
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 1,
      title: 'Где сэкономить?',
      description: 'Анализ ваших расходов',
      icon: <TrendingUp className="w-5 h-5" />,
      action: async () => {
        setAiLoading(true);
        try {
          const response = await financeService.request('/ai/analyze-economy', { method: 'POST' });
          if (response.success) {
            addMessage(response.data, 'ai');
            if (onAnalysisGenerated) onAnalysisGenerated('economy_tips', response.data);
          }
        } catch (error) {
          addMessage('Произошла ошибка при анализе. Попробуйте позже.', 'ai');
        } finally {
          setAiLoading(false);
        }
      }
    },
    {
      id: 2,
      title: 'Квартальный отчет',
      description: 'Сводка за 3 месяца',
      icon: <PieChart className="w-5 h-5" />,
      action: async () => {
        setAiLoading(true);
        try {
          const response = await financeService.request('/ai/quarter-report');
          if (response.success) {
            addMessage(response.data, 'ai');
            if (onAnalysisGenerated) onAnalysisGenerated('quarter_report', response.data);
          }
        } catch (error) {
          addMessage('Не удалось сгенерировать отчет.', 'ai');
        } finally {
          setAiLoading(false);
        }
      }
    },
    {
      id: 3,
      title: 'Прогноз на месяц',
      description: 'Что ожидать дальше?',
      icon: <Lightbulb className="w-5 h-5" />,
      action: async () => {
        setAiLoading(true);
        try {
          const response = await financeService.request('/ai/forecast');
          if (response.success) {
            addMessage(response.data, 'ai');
            if (onAnalysisGenerated) onAnalysisGenerated('forecast', response.data);
          }
        } catch (error) {
          addMessage('Ошибка прогнозирования.', 'ai');
        } finally {
          setAiLoading(false);
        }
      }
    }
  ];

  const addMessage = (text: string, sender: 'user' | 'ai') => {
    const newMessage: Message = { id: Date.now(), text, sender, timestamp: new Date() };
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      setTimeout(() => saveMessagesToStorage(updatedMessages), 0);
      return updatedMessages;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input;
    setInput('');
    addMessage(userMessage, 'user');
    setLoading(true);

    try {
      const response = await financeService.request('/ai/chat', { method: 'POST', body: { message: userMessage } });
      if (response.success) addMessage(response.data, 'ai');
      else addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'ai');
    } catch (error) {
      addMessage('Проблемы с подключением. Проверьте интернет.', 'ai');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm('Очистить всю историю переписки? История будет удалена из браузера.')) {
      const initialMessage = {
        id: 1,
        text: 'Привет! Я ваш финансовый помощник. История очищена. Могу помочь проанализировать расходы, дать советы по экономии или сделать прогноз.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
      saveMessagesToStorage([initialMessage]);
    }
  };

  const exportChatHistory = () => {
    const chatData = {
      exportedAt: new Date().toISOString(),
      messages: messages.map(msg => ({ ...msg, timestamp: msg.timestamp.toISOString() }))
    };
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => saveMessagesToStorage(messages);
  }, [messages]);

  return (
      <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Финансовый помощник</h3>
              <p className="text-xs text-gray-500">AI аналитик • {messages.length} сообщений</p>
              <p className="text-xs text-gray-400">История сохраняется в браузере</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{aiLoading ? 'Анализирую...' : 'Онлайн'}</span>
            <button onClick={clearChat} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Очистить историю">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={exportChatHistory} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors" title="Экспорт истории">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Быстрые действия</h4>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action) => (
                <button key={action.id} onClick={action.action} disabled={aiLoading} className="flex flex-col items-center justify-center p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-50">
                  <div className="text-blue-600 mb-1">{action.icon}</div>
                  <div className="text-xs font-medium text-gray-900">{action.title}</div>
                  <div className="text-xs text-gray-500 truncate w-full">{action.description}</div>
                </button>
            ))}
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0 max-h-[calc(800px-180px)]">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-4 py-2 ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                    <div className="whitespace-pre-wrap break-words">{message.text}</div>
                    <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      <span className="ml-2 opacity-70">{message.timestamp.toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg rounded-bl-none px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="text-sm text-gray-600 ml-2">AI думает...</span>
                    </div>
                  </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Спросите о ваших финансах..." className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows={2} disabled={loading} />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12" title="Отправить">
              <Send className="w-4 h-4"/>
            </button>
            <button onClick={refreshData} className="p-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200" title="Обновить данные для AI">🔄 Обновить данные</button>
          </div>
          <div className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>Пример: «Как сократить расходы на еду?»</span>
            <div className="flex space-x-4">
              <span>{input.length}/500</span>
              <button onClick={() => { if (confirm('Очистить поле ввода?')) setInput(''); }} className="text-gray-400 hover:text-gray-600">Очистить</button>
            </div>
          </div>
        </div>
      </div>
  );
}