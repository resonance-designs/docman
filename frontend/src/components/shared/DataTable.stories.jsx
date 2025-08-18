/*
 * @name DataTable Stories
 * @file /docman/frontend/src/components/shared/DataTable.stories.jsx
 * @description Storybook stories for DataTable component
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
import { useState } from 'react';
import DataTable from './DataTable';

export default {
  title: 'Shared/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A powerful data table component with sorting, filtering, pagination, and row selection capabilities. Designed for displaying large datasets with optimal performance.'
      }
    }
  },
  argTypes: {
    data: {
      description: 'Array of data objects to display'
    },
    columns: {
      description: 'Array of column configuration objects'
    },
    loading: {
      control: 'boolean',
      description: 'Whether the table is in loading state'
    },
    sortable: {
      control: 'boolean',
      description: 'Whether columns are sortable'
    },
    selectable: {
      control: 'boolean',
      description: 'Whether rows are selectable'
    },
    pagination: {
      control: 'boolean',
      description: 'Whether to show pagination'
    },
    pageSize: {
      control: 'number',
      description: 'Number of rows per page'
    },
    onSort: {
      action: 'sorted',
      description: 'Sort event handler'
    },
    onSelect: {
      action: 'selected',
      description: 'Row selection event handler'
    },
    onRowClick: {
      action: 'row-clicked',
      description: 'Row click event handler'
    }
  },
  tags: ['autodocs']
};

// Sample data for stories
const sampleUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', lastLogin: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active', lastLogin: '2024-01-14' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer', status: 'Inactive', lastLogin: '2024-01-10' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active', lastLogin: '2024-01-13' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Viewer', status: 'Active', lastLogin: '2024-01-12' },
  { id: 6, name: 'Diana Davis', email: 'diana@example.com', role: 'Admin', status: 'Active', lastLogin: '2024-01-11' },
  { id: 7, name: 'Eve Miller', email: 'eve@example.com', role: 'Editor', status: 'Inactive', lastLogin: '2024-01-09' },
  { id: 8, name: 'Frank Garcia', email: 'frank@example.com', role: 'Viewer', status: 'Active', lastLogin: '2024-01-08' }
];

const sampleDocuments = [
  { id: 1, title: 'API Documentation', author: 'John Doe', category: 'Technical', status: 'Published', lastModified: '2024-01-15' },
  { id: 2, title: 'User Manual', author: 'Jane Smith', category: 'Documentation', status: 'Draft', lastModified: '2024-01-14' },
  { id: 3, title: 'Privacy Policy', author: 'Bob Johnson', category: 'Legal', status: 'Published', lastModified: '2024-01-13' },
  { id: 4, title: 'Project Requirements', author: 'Alice Brown', category: 'Business', status: 'Review', lastModified: '2024-01-12' },
  { id: 5, title: 'Installation Guide', author: 'Charlie Wilson', category: 'Technical', status: 'Published', lastModified: '2024-01-11' }
];

// Column configurations
const userColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { 
    key: 'status', 
    label: 'Status', 
    sortable: true,
    render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value}
      </span>
    )
  },
  { key: 'lastLogin', label: 'Last Login', sortable: true }
];

const documentColumns = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'author', label: 'Author', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { 
    key: 'status', 
    label: 'Status', 
    sortable: true,
    render: (value) => {
      const colors = {
        'Published': 'bg-green-100 text-green-800',
        'Draft': 'bg-yellow-100 text-yellow-800',
        'Review': 'bg-blue-100 text-blue-800'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
          {value}
        </span>
      );
    }
  },
  { key: 'lastModified', label: 'Last Modified', sortable: true }
];

export const Default = {
  args: {
    data: sampleUsers,
    columns: userColumns,
    loading: false,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 5
  }
};

export const Loading = {
  args: {
    data: [],
    columns: userColumns,
    loading: true,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 5
  }
};

export const Selectable = {
  render: (args) => {
    const [selectedRows, setSelectedRows] = useState([]);
    
    return (
      <div>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Selected rows: {selectedRows.length > 0 ? selectedRows.join(', ') : 'None'}
          </p>
        </div>
        <DataTable 
          {...args} 
          onSelect={setSelectedRows}
        />
      </div>
    );
  },
  args: {
    data: sampleUsers,
    columns: userColumns,
    loading: false,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 5
  }
};

export const DocumentsTable = {
  args: {
    data: sampleDocuments,
    columns: documentColumns,
    loading: false,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 3
  }
};

export const WithActions = {
  render: (args) => {
    const columnsWithActions = [
      ...userColumns,
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (value, row) => (
          <div className="flex gap-2">
            <button 
              onClick={() => alert(`Edit user: ${row.name}`)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button 
              onClick={() => alert(`Delete user: ${row.name}`)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        )
      }
    ];
    
    return (
      <DataTable 
        {...args} 
        columns={columnsWithActions}
        onRowClick={(row) => alert(`Clicked on: ${row.name}`)}
      />
    );
  },
  args: {
    data: sampleUsers,
    loading: false,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 5
  }
};

export const EmptyState = {
  args: {
    data: [],
    columns: userColumns,
    loading: false,
    sortable: true,
    selectable: false,
    pagination: true,
    pageSize: 5
  }
};

export const LargeDataset = {
  render: (args) => {
    // Generate a larger dataset
    const largeDataset = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      role: ['Admin', 'Editor', 'Viewer'][index % 3],
      status: ['Active', 'Inactive'][index % 2],
      lastLogin: `2024-01-${String(15 - (index % 15)).padStart(2, '0')}`
    }));
    
    return <DataTable {...args} data={largeDataset} />;
  },
  args: {
    columns: userColumns,
    loading: false,
    sortable: true,
    selectable: true,
    pagination: true,
    pageSize: 10
  }
};

export const CustomStyling = {
  render: (args) => {
    const customColumns = userColumns.map(col => ({
      ...col,
      headerClassName: 'bg-blue-50 text-blue-900 font-bold',
      cellClassName: col.key === 'role' ? 'font-medium' : ''
    }));
    
    return (
      <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
        <DataTable 
          {...args} 
          columns={customColumns}
          className="custom-table"
        />
      </div>
    );
  },
  args: {
    data: sampleUsers.slice(0, 3),
    loading: false,
    sortable: true,
    selectable: false,
    pagination: false
  }
};
