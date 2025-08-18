/*
 * @name LoadingSpinner Stories
 * @file /docman/frontend/src/components/shared/LoadingSpinner.stories.jsx
 * @description Storybook stories for LoadingSpinner component
 * @author Richard Bakos
 * @version 2.1.7
 * @license UNLICENSED
 */
import LoadingSpinner from './LoadingSpinner';

export default {
  title: 'Shared/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A customizable loading spinner component with multiple size variants and optional text. Provides consistent loading states across the application.'
      }
    }
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Spinner size variant'
    },
    text: {
      control: 'text',
      description: 'Optional loading text to display below spinner'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    },
    color: {
      control: { type: 'select' },
      options: ['blue', 'green', 'red', 'yellow', 'purple', 'gray'],
      description: 'Spinner color theme'
    }
  },
  tags: ['autodocs']
};

export const Default = {
  args: {
    size: 'md'
  }
};

export const Small = {
  args: {
    size: 'sm'
  }
};

export const Large = {
  args: {
    size: 'lg'
  }
};

export const ExtraLarge = {
  args: {
    size: 'xl'
  }
};

export const WithText = {
  args: {
    size: 'md',
    text: 'Loading...'
  }
};

export const WithCustomText = {
  args: {
    size: 'lg',
    text: 'Processing your request...'
  }
};

export const BlueSpinner = {
  args: {
    size: 'md',
    color: 'blue',
    text: 'Loading data...'
  }
};

export const GreenSpinner = {
  args: {
    size: 'md',
    color: 'green',
    text: 'Saving changes...'
  }
};

export const RedSpinner = {
  args: {
    size: 'md',
    color: 'red',
    text: 'Processing error...'
  }
};

export const AllSizes = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner size="sm" />
        <p className="mt-2 text-sm text-gray-600">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-2 text-sm text-gray-600">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">Large</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <p className="mt-2 text-sm text-gray-600">Extra Large</p>
      </div>
    </div>
  )
};

export const AllColors = {
  render: () => (
    <div className="grid grid-cols-3 gap-6">
      <div className="text-center">
        <LoadingSpinner size="md" color="blue" />
        <p className="mt-2 text-sm text-gray-600">Blue</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" color="green" />
        <p className="mt-2 text-sm text-gray-600">Green</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" color="red" />
        <p className="mt-2 text-sm text-gray-600">Red</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" color="yellow" />
        <p className="mt-2 text-sm text-gray-600">Yellow</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" color="purple" />
        <p className="mt-2 text-sm text-gray-600">Purple</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" color="gray" />
        <p className="mt-2 text-sm text-gray-600">Gray</p>
      </div>
    </div>
  )
};

export const InCard = {
  render: () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Loading Content</h3>
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" text="Fetching data..." />
      </div>
    </div>
  )
};

export const InButton = {
  render: () => (
    <div className="space-y-4">
      <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50" disabled>
        <LoadingSpinner size="sm" color="white" />
        Saving...
      </button>
      
      <button className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50" disabled>
        <LoadingSpinner size="sm" color="white" />
        Processing Payment
      </button>
      
      <button className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50" disabled>
        <LoadingSpinner size="sm" color="white" />
        Deleting...
      </button>
    </div>
  )
};

export const FullPageOverlay = {
  render: () => (
    <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
      {/* Simulated page content */}
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Page Content</h2>
        <p className="text-gray-600 mb-4">This is some sample content that would be on the page.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Card 1</h3>
            <p className="text-sm text-gray-600">Some content here</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Card 2</h3>
            <p className="text-sm text-gray-600">Some content here</p>
          </div>
        </div>
      </div>
      
      {/* Loading overlay */}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading page content..." />
      </div>
    </div>
  )
};

export const InlineWithText = {
  render: () => (
    <div className="space-y-4">
      <p className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        Loading user data...
      </p>
      
      <p className="flex items-center gap-2">
        <LoadingSpinner size="sm" color="green" />
        Syncing files...
      </p>
      
      <p className="flex items-center gap-2">
        <LoadingSpinner size="sm" color="red" />
        Retrying connection...
      </p>
    </div>
  )
};
