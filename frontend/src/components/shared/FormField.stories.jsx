/*
 * @name FormField Stories
 * @file /docman/frontend/src/components/shared/FormField.stories.jsx
 * @description Storybook stories for FormField component
 * @author Richard Bakos
 * @version 2.0.0
 * @license UNLICENSED
 */
import { useState } from 'react';
import FormField from './FormField';

export default {
  title: 'Shared/FormField',
  component: FormField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A standardized form field component that provides consistent styling and behavior across all forms. Supports various input types, validation states, and accessibility features.'
      }
    }
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Field label text'
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'textarea', 'select', 'file'],
      description: 'Input type'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    value: {
      control: 'text',
      description: 'Field value'
    },
    error: {
      control: 'text',
      description: 'Error message to display'
    },
    required: {
      control: 'boolean',
      description: 'Whether the field is required'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the field is disabled'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    },
    onChange: {
      action: 'changed',
      description: 'Change event handler'
    }
  },
  tags: ['autodocs']
};

/**
 * Interactive form field with state
 */
const FormFieldWithState = (args) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="max-w-md">
      <FormField 
        {...args} 
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-2 text-sm text-gray-600">
        Current value: <code>{value}</code>
      </div>
    </div>
  );
};

export const Default = {
  render: FormFieldWithState,
  args: {
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name',
    required: false,
    disabled: false
  }
};

export const Required = {
  render: FormFieldWithState,
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    disabled: false
  }
};

export const WithError = {
  render: FormFieldWithState,
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    error: 'Password must be at least 8 characters long',
    required: true,
    disabled: false
  }
};

export const Disabled = {
  render: FormFieldWithState,
  args: {
    label: 'Username',
    type: 'text',
    value: 'johndoe',
    placeholder: 'Username',
    disabled: true
  }
};

export const TextArea = {
  render: FormFieldWithState,
  args: {
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter a detailed description...',
    required: false,
    disabled: false
  }
};

export const NumberInput = {
  render: FormFieldWithState,
  args: {
    label: 'Age',
    type: 'number',
    placeholder: 'Enter your age',
    required: false,
    disabled: false
  }
};

export const SelectField = {
  render: (args) => {
    const [value, setValue] = useState(args.value || '');
    
    return (
      <div className="max-w-md">
        <FormField 
          {...args} 
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Select a category</option>
          <option value="technical">Technical Documentation</option>
          <option value="business">Business Requirements</option>
          <option value="legal">Legal Documents</option>
          <option value="hr">HR Policies</option>
        </FormField>
        <div className="mt-2 text-sm text-gray-600">
          Selected: <code>{value || 'None'}</code>
        </div>
      </div>
    );
  },
  args: {
    label: 'Document Category',
    type: 'select',
    required: true,
    disabled: false
  }
};

export const FileInput = {
  render: (args) => {
    const [fileName, setFileName] = useState('');
    
    return (
      <div className="max-w-md">
        <FormField 
          {...args} 
          onChange={(e) => {
            const file = e.target.files[0];
            setFileName(file ? file.name : '');
          }}
        />
        <div className="mt-2 text-sm text-gray-600">
          Selected file: <code>{fileName || 'None'}</code>
        </div>
      </div>
    );
  },
  args: {
    label: 'Upload Document',
    type: 'file',
    required: false,
    disabled: false
  }
};

export const AllVariants = {
  render: () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      age: '',
      category: '',
      description: '',
      file: null
    });
    
    const handleChange = (field) => (e) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.type === 'file' ? e.target.files[0] : e.target.value
      }));
    };
    
    return (
      <div className="max-w-md space-y-4">
        <h3 className="text-lg font-semibold mb-4">Complete Form Example</h3>
        
        <FormField 
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange('name')}
          required
        />
        
        <FormField 
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange('email')}
          required
        />
        
        <FormField 
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange('password')}
          error={formData.password && formData.password.length < 8 ? 'Password must be at least 8 characters' : ''}
          required
        />
        
        <FormField 
          label="Age"
          type="number"
          placeholder="Enter your age"
          value={formData.age}
          onChange={handleChange('age')}
        />
        
        <FormField 
          label="Category"
          type="select"
          value={formData.category}
          onChange={handleChange('category')}
          required
        >
          <option value="">Select a category</option>
          <option value="technical">Technical</option>
          <option value="business">Business</option>
          <option value="legal">Legal</option>
        </FormField>
        
        <FormField 
          label="Description"
          type="textarea"
          placeholder="Enter a description..."
          value={formData.description}
          onChange={handleChange('description')}
        />
        
        <FormField 
          label="Upload File"
          type="file"
          onChange={handleChange('file')}
        />
        
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">Form Data:</h4>
          <pre className="text-sm text-gray-600">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>
    );
  }
};
