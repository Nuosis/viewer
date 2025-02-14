import { useCallback, useState } from 'react';

// Export main hooks
export { useCustomer } from './useCustomer';
export { useProject } from './useProject';
export { useTask } from './useTask';

/**
 * Hook for managing loading and error states
 */
export function useLoadingState(initialLoading = false) {
    const [loading, setLoading] = useState(initialLoading);
    const [error, setError] = useState(null);

    const startLoading = useCallback(() => {
        setLoading(true);
        setError(null);
    }, []);

    const stopLoading = useCallback((err = null) => {
        setLoading(false);
        setError(err);
    }, []);

    return {
        loading,
        error,
        startLoading,
        stopLoading,
        clearError: () => setError(null)
    };
}

/**
 * Hook for managing selection state
 */
export function useSelection(onSelect = null) {
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = useCallback(async (id) => {
        setSelectedId(id);
        if (onSelect) {
            await onSelect(id);
        }
    }, [onSelect]);

    return {
        selectedId,
        handleSelect,
        clearSelection: () => setSelectedId(null)
    };
}

/**
 * Hook for managing form state
 */
export function useFormState(initialData = {}, validate = null) {
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});

    const handleChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error for changed field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    const validateForm = useCallback(() => {
        if (!validate) return true;

        const validationResult = validate(formData);
        if (!validationResult.isValid) {
            setErrors(validationResult.errors);
            return false;
        }

        setErrors({});
        return true;
    }, [formData, validate]);

    const resetForm = useCallback(() => {
        setFormData(initialData);
        setErrors({});
    }, [initialData]);

    return {
        formData,
        errors,
        handleChange,
        validateForm,
        resetForm,
        setFormData
    };
}

/**
 * Hook for managing pagination
 */
export function usePagination(items = [], pageSize = 10) {
    const [currentPage, setCurrentPage] = useState(1);
    
    const totalPages = Math.ceil(items.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
        currentPage,
        totalPages,
        paginatedItems,
        setPage: setCurrentPage,
        nextPage: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
        prevPage: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
        goToPage: (page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))
    };
}

/**
 * Hook for managing sorting
 */
export function useSorting(initialSortField = null, initialSortDirection = 'asc') {
    const [sortField, setSortField] = useState(initialSortField);
    const [sortDirection, setSortDirection] = useState(initialSortDirection);

    const sortItems = useCallback((items, getFieldValue = item => item[sortField]) => {
        if (!sortField) return items;

        return [...items].sort((a, b) => {
            const aValue = getFieldValue(a);
            const bValue = getFieldValue(b);
            
            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }, [sortField, sortDirection]);

    const toggleSort = useCallback((field) => {
        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField]);

    return {
        sortField,
        sortDirection,
        sortItems,
        toggleSort
    };
}

/**
 * Hook for managing filters
 */
export function useFilters(initialFilters = {}) {
    const [filters, setFilters] = useState(initialFilters);

    const applyFilter = useCallback((field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const clearFilter = useCallback((field) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[field];
            return newFilters;
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters({});
    }, []);

    const filterItems = useCallback((items, filterFns = {}) => {
        return items.filter(item => 
            Object.entries(filters).every(([field, value]) => {
                const filterFn = filterFns[field] || ((item, value) => item[field] === value);
                return filterFn(item, value);
            })
        );
    }, [filters]);

    return {
        filters,
        applyFilter,
        clearFilter,
        clearAllFilters,
        filterItems
    };
}