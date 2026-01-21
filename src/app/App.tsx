import React, { useState } from 'react';
import { BarChart3, List, Settings, Plus, User } from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionLog } from '@/app/components/TransactionLog';
import { AddTransaction } from '@/app/components/AddTransaction';
import { Button } from '@/app/components/ui/button';
import { Toaster } from '@/app/components/ui/sonner';

type Screen = 'dashboard' | 'transactions' | 'settings';

export default function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
    const [addTransactionOpen, setAddTransactionOpen] = useState(false);

    const getCurrentMonth = () => {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const now = new Date();
        return `${months[now.getMonth()]} ${now.getFullYear()}`;
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
            <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl text-[#333]">Мой ПВЗ</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{getCurrentMonth()}</span>
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {currentScreen === 'dashboard' && <Dashboard />}
                    {currentScreen === 'transactions' && <TransactionLog />}
                    {currentScreen === 'settings' && (
                        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-xl mb-2">Настройки</h2>
                            <p className="text-gray-600">Управление категориями и настройками системы</p>
                        </div>
                    )}
                </div>
            </main>

            <nav className="bg-white border-t border-gray-200 z-20 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-around items-center h-16">
                        <button onClick={() => setCurrentScreen('dashboard')} className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${currentScreen === 'dashboard' ? 'text-[#333]' : 'text-gray-400'}`}>
                            <BarChart3 className="w-6 h-6" /><span className="text-xs">Графики</span>
                        </button>
                        <button onClick={() => setCurrentScreen('transactions')} className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${currentScreen === 'transactions' ? 'text-[#333]' : 'text-gray-400'}`}>
                            <List className="w-6 h-6" /><span className="text-xs">Операции</span>
                        </button>
                        <button onClick={() => setCurrentScreen('settings')} className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${currentScreen === 'settings' ? 'text-[#333]' : 'text-gray-400'}`}>
                            <Settings className="w-6 h-6" /><span className="text-xs">Настройки</span>
                        </button>
                    </div>
                </div>
            </nav>

            <Button onClick={() => setAddTransactionOpen(true)} size="lg" className="fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg z-30">
                <Plus className="w-6 h-6" />
            </Button>

            <AddTransaction open={addTransactionOpen} onOpenChange={setAddTransactionOpen} />
            <Toaster />
        </div>
    );
}