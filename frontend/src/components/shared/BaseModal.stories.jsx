/*
 * @name BaseModal Stories
 * @file /docman/frontend/src/components/shared/BaseModal.stories.jsx
 * @description Storybook stories for BaseModal component
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useState } from 'react';
import BaseModal from './BaseModal';

export default {
  title: 'Shared/BaseModal',
  component: BaseModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A reusable modal component that provides a foundation for all modal dialogs in the application. Features backdrop click handling, escape key support, and customizable styling.'
      }
    }
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible'
    },
    onClose: {
      action: 'closed',
      description: 'Callback function called when modal should be closed'
    },
    title: {
      control: 'text',
      description: 'Modal title displayed in the header'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'Modal size variant'
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show the X close button in header'
    },
    closeOnBackdropClick: {
      control: 'boolean',
      description: 'Whether clicking the backdrop closes the modal'
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Whether pressing Escape closes the modal'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the modal content'
    },
    children: {
      control: 'text',
      description: 'Modal content'
    }
  },
  tags: ['autodocs']
};

/**
 * Interactive modal story with state management
 */
const ModalWithState = (args) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Open Modal
      </button>
      
      <BaseModal 
        {...args} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            This is the modal content. You can put any React components here.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsOpen(false)}
              className="btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Confirm
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export const Default = {
  render: ModalWithState,
  args: {
    title: 'Default Modal',
    size: 'md',
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: true
  }
};

export const Small = {
  render: ModalWithState,
  args: {
    title: 'Small Modal',
    size: 'sm',
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: true
  }
};

export const Large = {
  render: ModalWithState,
  args: {
    title: 'Large Modal',
    size: 'lg',
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: true
  }
};

export const NoCloseButton = {
  render: ModalWithState,
  args: {
    title: 'Modal Without Close Button',
    size: 'md',
    showCloseButton: false,
    closeOnBackdropClick: true,
    closeOnEscape: true
  }
};

export const NoBackdropClose = {
  render: ModalWithState,
  args: {
    title: 'Modal - No Backdrop Close',
    size: 'md',
    showCloseButton: true,
    closeOnBackdropClick: false,
    closeOnEscape: true
  }
};

export const NoEscapeClose = {
  render: ModalWithState,
  args: {
    title: 'Modal - No Escape Close',
    size: 'md',
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: false
  }
};

export const CustomContent = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <button 
          onClick={() => setIsOpen(true)}
          className="btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Open Custom Modal
        </button>
        
        <BaseModal 
          {...args} 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)}
        >
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Custom Form</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea 
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your message"
                  />
                </div>
              </form>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsOpen(false)}
                className="btn bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Submit
              </button>
            </div>
          </div>
        </BaseModal>
      </div>
    );
  },
  args: {
    title: 'Contact Form',
    size: 'md',
    showCloseButton: true,
    closeOnBackdropClick: false,
    closeOnEscape: true
  }
};
