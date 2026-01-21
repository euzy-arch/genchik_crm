import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Trash2, Loader2, Pencil } from 'lucide-react';
import financeService from '../../services/financeService';
import { TransactionEditForm } from './TransactionEditForm';

interface Transaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  category_id?: number;
}

export function TransactionLog() {
  const [filter, setFilter] = useState('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDeleteConfirm(null);
  };

  const handleUpdateSuccess = () => loadTransactions();

  const loadCategories = async () => {
    try {
      const response = await financeService.getCategories();
      if (response.success && response.data) {
        const categoryMap: Record<number, string> = {};
        response.data.forEach((cat: any) => categoryMap[cat.id] = cat.name);
        setCategories(categoryMap);
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeService.getOperations();

      if (response.success && response.data) {
        const formattedTransactions: Transaction[] = response.data.map((op: any) => ({
          id: op.id,
          date: op.operation_date || op.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          description: op.description || 'Без описания',
          category: op.category_name || categories[op.category_id] || (op.type === 'income' ? 'Доход' : 'Без категории'),
          amount: op.type === 'income' ? op.amount : -Math.abs(op.amount),
          type: op.type,
          category_id: op.category_id
        }));

        formattedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(formattedTransactions);
      } else {
        setError('Не удалось загрузить операции');
      }
    } catch (err) {
      console.error('Ошибка загрузки операций:', err);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту операцию?')) return;

    try {
      setDeletingId(id);
      const response = await financeService.deleteOperation(id);

      if (response.success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setDeleteConfirm(null);
      } else {
        alert('Не удалось удалить операцию');
      }
    } catch (err) {
      console.error('Ошибка удаления операции:', err);
      alert('Ошибка при удалении операции');
    } finally {
      setDeletingId(null);
    }
  };

  const startDelete = (id: number) => setDeleteConfirm(id);
  const cancelDelete = () => setDeleteConfirm(null);

  const applyFilter = (transactionsList: Transaction[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        return transactionsList.filter(t => new Date(t.date) >= today);
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionsList.filter(t => new Date(t.date) >= weekAgo);
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return transactionsList.filter(t => new Date(t.date) >= monthAgo);
      default:
        return transactionsList;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCategories();
      await loadTransactions();
    };
    initialize();
  }, []);

  const formatAmount = (amount: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(Math.abs(amount));
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString));

  const filteredTransactions = applyFilter(transactions);
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpense;

  if (loading) {
    return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl">Операции</h2>
            <div className="flex gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="all">Все</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Загрузка операций...</span>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl">Операции</h2>
            <div className="flex gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="all">Все</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="text-red-500 text-2xl mb-3">⚠️</div>
              <h3 className="text-lg text-gray-900 mb-2">Ошибка загрузки</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadTransactions}>Попробовать снова</Button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl">Операции</h2>
          <div className="flex gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="all">Все</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTransactions} variant="outline">Обновить</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Доходы ({filter})</div>
            <div className="text-2xl font-bold text-green-600">{formatAmount(totalIncome)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Расходы ({filter})</div>
            <div className="text-2xl font-bold text-red-600">{formatAmount(totalExpense)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Баланс ({filter})</div>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{balance >= 0 ? '+' : ''}{formatAmount(balance)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-3xl mb-4">📝</div>
                <h3 className="text-lg text-gray-900 mb-2">Нет операций</h3>
                <p className="text-gray-600">
                  {filter === 'today' ? 'Сегодня еще не было операций' :
                      filter === 'week' ? 'На этой неделе не было операций' :
                          filter === 'month' ? 'В этом месяце не было операций' : 'В системе еще нет операций'}
                </p>
              </div>
          ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">Показано {filteredTransactions.length} из {transactions.length} операций</div>
                  <div className="text-xs text-gray-500">Нажмите на иконки для редактирования или удаления операции</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Дата</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Описание</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Категория</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Сумма</th>
                      <th className="px-6 py-3 text-center text-xs text-gray-600">Действия</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(transaction.date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{transaction.category}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-medium" style={{ color: transaction.type === 'income' ? '#10B981' : '#EF4444' }}>
                            {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {deleteConfirm === transaction.id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleDelete(transaction.id)} disabled={deletingId === transaction.id} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 flex items-center">
                                    {deletingId === transaction.id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Удалить
                                  </button>
                                  <button onClick={cancelDelete} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">Отмена</button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleEdit(transaction)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Редактировать операцию"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={() => startDelete(transaction.id)} disabled={deletingId === transaction.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50" title="Удалить операцию">
                                    {deletingId === transaction.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                </div>
                            )}
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </>
          )}
        </div>

        {editingTransaction && <TransactionEditForm transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onUpdate={handleUpdateSuccess} />}
      </div>
  );
}