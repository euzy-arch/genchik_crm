import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import financeService from '../../services/financeService';

interface Category {
  id: number;
  name: string;
}

interface AddTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransaction({ open, onOpenChange }: AddTransactionProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    date: new Date(),
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category_id: '0'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await financeService.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
      }
    };

    if (open) {
      loadCategories();
      setFormData({
        date: new Date(),
        description: '',
        amount: '',
        type: 'expense',
        category_id: '0'
      });
      setErrors({});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const newErrors: Record<string, string> = {};
      if (!formData.description.trim()) newErrors.description = 'Введите описание';
      if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Введите корректную сумму';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const operationData: any = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        type: formData.type,
        operation_date: format(formData.date, 'yyyy-MM-dd')
      };

      if (formData.type === 'expense' && formData.category_id !== '0') {
        operationData.category_id = parseInt(formData.category_id);
      }

      const response = await financeService.createOperation(operationData);

      if (response.success) {
        toast.success('Операция успешно добавлена');
        onOpenChange(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(response.message || 'Ошибка при создании операции');
        setErrors({ general: response.message || 'Ошибка обновления' });
      }
    } catch (error: any) {
      console.error('Ошибка при создании операции:', error);
      toast.error(error.message || 'Ошибка подключения');
      setErrors({ general: error.message || 'Ошибка подключения' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!open) return null;

  return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Добавить операцию</h3>
              <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Тип операции</label>
                <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => handleChange('type', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Доход</SelectItem>
                    <SelectItem value="expense">Расход</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Дата</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, 'PPP', { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.date} onSelect={(date) => date && handleChange('date', date)} initialFocus locale={ru} />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание {errors.description && <span className="text-red-500 text-xs ml-2">{errors.description}</span>}
                </label>
                <Input value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="На что потратили или откуда доход" className={errors.description ? 'border-red-500' : ''} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Сумма {errors.amount && <span className="text-red-500 text-xs ml-2">{errors.amount}</span>}
                </label>
                <Input type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} placeholder="0" min="0" step="0.01" className={errors.amount ? 'border-red-500' : ''} />
              </div>

              {formData.type === 'expense' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Категория</label>
                    <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                      <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              )}

              {errors.general && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{errors.general}</div>}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>Отмена</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Добавление...</> : 'Добавить'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
}