import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Loader2, X } from 'lucide-react';
import financeService from '../../services/financeService';

interface Category {
    id: number;
    name: string;
}

interface TransactionEditFormProps {
    transaction: {
        id: number;
        date: string;
        description: string;
        category: string;
        amount: number;
        type: 'income' | 'expense';
        category_id?: number;
    };
    onClose: () => void;
    onUpdate: () => void;
}

export function TransactionEditForm({ transaction, onClose, onUpdate }: TransactionEditFormProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        date: new Date(transaction.date).toISOString().split('T')[0],
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        type: transaction.type,
        category_id: transaction.category_id?.toString() || '0'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const modalRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLButtonElement>(null);
    const categorySelectRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isSelectElement = target.closest('[role="combobox"]') || target.closest('[role="listbox"]') || target.closest('[data-radix-select-viewport]') || (selectRef.current && selectRef.current.contains(target)) || (categorySelectRef.current && categorySelectRef.current.contains(target));
            if (modalRef.current && !modalRef.current.contains(target) && !isSelectElement) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await financeService.getCategories();
                if (response.success && response.data) setCategories(response.data);
            } catch (err) {
                console.error('Ошибка загрузки категорий:', err);
            }
        };
        loadCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const newErrors: Record<string, string> = {};
            if (!formData.description.trim()) newErrors.description = 'Введите описание';
            if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Введите корректную сумму';
            if (!formData.date) newErrors.date = 'Введите дату';

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            const operationData: any = {
                description: formData.description.trim(),
                amount: parseFloat(formData.amount),
                type: formData.type,
                operation_date: formData.date
            };

            if (formData.type === 'expense' && formData.category_id !== '0') {
                operationData.category_id = parseInt(formData.category_id);
            }

            const response = await financeService.updateOperation(transaction.id, operationData);

            if (response.success) {
                onUpdate();
                onClose();
            } else {
                setErrors({ general: response.message || 'Ошибка обновления' });
            }
        } catch (error: any) {
            console.error('Ошибка при обновлении операции:', error);
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

    const handleSelectClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={onClose} />
            <div ref={modalRef} className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">Редактировать операцию</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Закрыть"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4" onClick={handleSelectClick}>
                    <div onClick={handleSelectClick}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Тип операции</label>
                        <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => handleChange('type', value)}>
                            <SelectTrigger ref={selectRef} className="w-full" onClick={handleSelectClick}><SelectValue /></SelectTrigger>
                            <SelectContent onClick={handleSelectClick}>
                                <SelectItem value="income" onClick={handleSelectClick}>Доход</SelectItem>
                                <SelectItem value="expense" onClick={handleSelectClick}>Расход</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Дата {errors.date && <span className="text-red-500 text-xs ml-2">{errors.date}</span>}</label>
                        <Input type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} onClick={handleSelectClick} className={`w-full ${errors.date ? 'border-red-500' : ''}`} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Описание {errors.description && <span className="text-red-500 text-xs ml-2">{errors.description}</span>}</label>
                        <Input value={formData.description} onChange={(e) => handleChange('description', e.target.value)} onClick={handleSelectClick} placeholder="На что потратили или откуда доход" className={errors.description ? 'border-red-500' : ''} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Сумма {errors.amount && <span className="text-red-500 text-xs ml-2">{errors.amount}</span>}</label>
                        <Input type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} onClick={handleSelectClick} placeholder="0" min="0" step="0.01" className={errors.amount ? 'border-red-500' : ''} />
                    </div>

                    {formData.type === 'expense' && (
                        <div onClick={handleSelectClick}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Категория {errors.category_id && <span className="text-red-500 text-xs ml-2">{errors.category_id}</span>}</label>
                            <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                                <SelectTrigger ref={categorySelectRef} className={`w-full ${errors.category_id ? 'border-red-500' : ''}`} onClick={handleSelectClick}><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                                <SelectContent onClick={handleSelectClick}>
                                    <SelectItem value="0" onClick={handleSelectClick}>Без категории</SelectItem>
                                    {categories.map((category) => <SelectItem key={category.id} value={category.id.toString()} onClick={handleSelectClick}>{category.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {errors.general && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{errors.general}</div>}

                    <div className="flex gap-3 pt-4" onClick={handleSelectClick}>
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>Отмена</Button>
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Сохранение...</> : 'Сохранить'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}