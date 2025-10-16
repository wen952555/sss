import { useState } from 'react';

export const useAuth = (authFn, setToken, handleClose) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e, formData) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authFn(formData);
            if (!data.success) {
                throw new Error(data.message || '发生错误。');
            }
            setToken(data.token);
            setTimeout(handleClose, 1000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, handleSubmit };
};