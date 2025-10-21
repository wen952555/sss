import React, { useReducer, useCallback } from 'react';
import './AuthModal.css';
import AuthForm from './auth/AuthForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import ResetPasswordForm from './auth/ResetPasswordForm';

const initialState = {
    view: 'login',
    phone: '',
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'SET_PHONE':
            return { ...state, phone: action.payload };
        case 'RESET':
            return initialState;
        default:
            throw new Error();
    }
}

const AuthModal = ({ show, onClose, setToken }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { view, phone } = state;

    const handleClose = useCallback(() => {
        dispatch({ type: 'RESET' });
        onClose();
    }, [onClose]);

    if (!show) return null;

    const renderForm = () => {
        switch (view) {
            case 'register':
                return <AuthForm setToken={setToken} setView={(v) => dispatch({ type: 'SET_VIEW', payload: v })} handleClose={handleClose} isRegister navigate={onClose} />;
            case 'forgot':
                return <ForgotPasswordForm setView={(v) => dispatch({ type: 'SET_VIEW', payload: v })} setPhone={(p) => dispatch({ type: 'SET_PHONE', payload: p })} phone={phone} />;
            case 'reset':
                return <ResetPasswordForm setView={(v) => dispatch({ type: 'SET_VIEW', payload: v })} phone={phone} />;
            default:
                return <AuthForm setToken={setToken} setView={(v) => dispatch({ type: 'SET_VIEW', payload: v })} handleClose={handleClose} navigate={onClose} />;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={handleClose}>×</button>
                {renderForm()}
            </div>
        </div>
    );
};

export default AuthModal;
