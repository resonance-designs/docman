/*
 * @name useConfirmation
 * @file /docman/frontend/src/hooks/useConfirmation.js
 * @hook useConfirmation
 * @description Custom hook for handling confirmation modals
 * @version 2.2.0
 * @license UNLICENSED
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook for handling confirmation modals
 * @returns {Object} Confirmation state and handlers
 */
const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState({
    title: '',
    message: '',
    actionName: 'Confirm',
    onConfirm: () => {},
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Open the confirmation modal
   * @param {Object} options - Confirmation options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Confirmation message
   * @param {string} options.actionName - Name of the action (displayed on confirm button)
   * @param {Function} options.onConfirm - Function called when action is confirmed
   */
  const confirm = useCallback(({ title, message, actionName = 'Confirm', onConfirm }) => {
    setConfirmationData({ title, message, actionName, onConfirm });
    setIsOpen(true);
  }, []);

  /**
   * Close the confirmation modal
   */
  const closeConfirmation = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle confirmation action
   */
  const handleConfirm = useCallback(async () => {
    try {
      setIsLoading(true);
      await confirmationData.onConfirm();
    } finally {
      setIsLoading(false);
      closeConfirmation();
    }
  }, [confirmationData, closeConfirmation]);

  return {
    isOpen,
    confirmationData,
    isLoading,
    confirm,
    closeConfirmation,
    handleConfirm,
  };
};

export default useConfirmation;