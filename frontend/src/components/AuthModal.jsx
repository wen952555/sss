import React, { useState } from 'react';
import './AuthModal.css';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import ResetPasswordForm from './auth/ResetPasswordForm';

const AuthModal = ({ show, onClose, setToken }) => {
    const [view, setView] = useState('login');
    const [phone, setPhone] = useState('');

    const handleClose = () => {
        setView('login');
        setPhone('');
        onClose();
    };

    if (!show) return null;

    const renderForm = () => {
        switch (view) {
            case 'register':
                return <RegisterForm setView={setView} />;
            case 'forgot':
                return <ForgotPasswordForm setView={setView} setPhone={setPhone} phone={phone} />;
            case 'reset':
                return <ResetPasswordForm setView={setView} phone={phone} />;
            default:
                return <LoginForm setToken={setToken} setView={setView} handleClose={handleClose} />;
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