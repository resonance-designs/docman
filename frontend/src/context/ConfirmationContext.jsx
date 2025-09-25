/*
 * @name ConfirmationContext
 * @file /docman/frontend/src/context/ConfirmationContext.jsx
 * @context ConfirmationContext
 * @description Context provider for confirmation modals
 * @version 2.2.0
 * @license UNLICENSED
 */
import { createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import useConfirmation from '../hooks/useConfirmation';
import ConfirmActionModal from '../components/system/ConfirmActionModal';

// Create context
const ConfirmationContext = createContext(null);

/**
 * Hook to use the confirmation context
 * @returns {Object} Confirmation context
 */
export const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmationContext must be used within a ConfirmationProvider');
  }
  return context;
};

/**
 * Confirmation context provider
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} The confirmation provider component
 */
export const ConfirmationProvider = ({ children }) => {
  const {
    isOpen,
    confirmationData,
    isLoading,
    confirm,
    closeConfirmation,
    handleConfirm,
  } = useConfirmation();

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmActionModal
        isOpen={isOpen}
        onClose={closeConfirmation}
        title={confirmationData.title}
        message={confirmationData.message}
        actionName={confirmationData.actionName}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </ConfirmationContext.Provider>
  );
};

ConfirmationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ConfirmationContext;