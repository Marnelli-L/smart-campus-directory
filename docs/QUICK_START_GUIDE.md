# Quick Start Guide - Using New Components

## 🚀 How to Use the New Features

### 1. Loading Skeletons

Import and use skeleton components while data is loading:

```jsx
import { 
  TableSkeleton, 
  BuildingCardSkeleton,
  PageLoader 
} from '../components/LoadingSkeleton';

function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <TableSkeleton rows={5} columns={4} />;
  }

  return <div>{/* Your data here */}</div>;
}
```

**Available Skeletons**:
- `CardSkeleton` - For dashboard cards
- `TableSkeleton` - For data tables
- `BuildingCardSkeleton` - For building/directory cards
- `BuildingGridSkeleton` - Grid of building cards
- `FormSkeleton` - For forms
- `AnnouncementSkeleton` - For announcements
- `SearchSkeleton` - For search results
- `ProgressBar` - For uploads
- `LoadingSpinner` - Generic spinner
- `PageLoader` - Full page loading

### 2. Error Boundaries

Error boundaries are already set up globally in `App.jsx` and `main.jsx`. They automatically catch errors in any component.

To test:
```jsx
// Intentionally throw an error
function BrokenComponent() {
  throw new Error('Test error');
  return <div>This won't render</div>;
}
```

The error boundary will catch it and show a friendly error page.

### 3. Custom Hooks

Use custom hooks to manage data:

#### useAnnouncements
```jsx
import { useAnnouncements } from '../hooks/useAnnouncements';

function AnnouncementsPage() {
  const { 
    announcements, 
    loading, 
    error,
    createAnnouncement,
    deleteAnnouncement 
  } = useAnnouncements();

  const handleCreate = async () => {
    const result = await createAnnouncement({
      title: 'New Announcement',
      content: 'Details...',
      priority: 'high'
    });
    
    if (result.success) {
      alert('Created!');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {announcements.map(ann => (
        <div key={ann.id}>{ann.title}</div>
      ))}
    </div>
  );
}
```

#### useBuildings
```jsx
import { useBuildings } from '../hooks/useBuildings';

function BuildingsPage() {
  const { 
    buildings, 
    loading,
    createBuilding 
  } = useBuildings();

  const handleCreate = async (formData) => {
    // formData should include image file
    const result = await createBuilding(formData);
    if (result.success) {
      alert('Building created!');
    }
  };

  return <div>{/* Your UI */}</div>;
}
```

#### useFeedback
```jsx
import { useFeedback } from '../hooks/useFeedback';

function FeedbackPage() {
  // Can be 'feedback', 'reports', or 'visitor-feedback'
  const { 
    items, 
    loading,
    updateStatus 
  } = useFeedback('reports');

  const handleResolve = async (id) => {
    const result = await updateStatus(id, 'resolved', 'Issue fixed');
    if (result.success) {
      alert('Status updated!');
    }
  };

  return <div>{/* Your UI */}</div>;
}
```

### 4. Code Splitting (Already Implemented)

Routes are automatically lazy-loaded. No action needed!

When adding new routes, use this pattern:

```jsx
// In App.jsx or main.jsx
import { lazy, Suspense } from 'react';
import { PageLoader } from './components/LoadingSkeleton';

const NewPage = lazy(() => import('./pages/NewPage'));

function App() {
  return (
    <Suspense fallback={<PageLoader message="Loading page..." />}>
      <Routes>
        <Route path="/new" element={<NewPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 5. Memoization (Already Implemented)

Memoization is already added to Admin.jsx. To add to other components:

```jsx
import { useMemo } from 'react';

function MyComponent({ data, searchTerm }) {
  // Memoize expensive computation
  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]); // Only recalculate when these change

  return <div>{/* Use filteredData */}</div>;
}
```

### 6. Prettier Auto-Format (Setup Required)

#### Install Prettier Extension:
1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "Prettier - Code formatter"
3. Click Install
4. Reload VS Code

#### Test It:
1. Open any .jsx file
2. Make some messy formatting
3. Save file (Ctrl+S)
4. Watch it auto-format! ✨

#### Manual Format:
- Right-click → Format Document
- Or: Ctrl+Shift+P → "Format Document"

---

## 🧪 Testing Checklist

### Test Error Boundaries:
```jsx
// Add to any component temporarily
throw new Error('Test error boundary');
```
You should see a friendly error page instead of a crash.

### Test Loading Skeletons:
```jsx
// Simulate slow loading
const [loading, setLoading] = useState(true);

useEffect(() => {
  setTimeout(() => setLoading(false), 3000);
}, []);

if (loading) return <TableSkeleton />;
```

### Test Code Splitting:
1. Open DevTools → Network tab
2. Clear and refresh
3. Look for "main" chunk loading
4. Navigate to /admin
5. See "admin" chunk load separately

### Test Custom Hooks:
```jsx
// In a test component
const { announcements, loading, error } = useAnnouncements();

console.log('Announcements:', announcements);
console.log('Loading:', loading);
console.log('Error:', error);
```

### Test Memoization:
```jsx
// Add console.log to see when it recalculates
const filteredData = useMemo(() => {
  console.log('Filtering data...'); // Should only log when dependencies change
  return data.filter(/* ... */);
}, [data, searchTerm]);
```

---

## 📝 Common Patterns

### Pattern 1: List with Loading
```jsx
function ItemList() {
  const { items, loading } = useAnnouncements();

  if (loading) return <TableSkeleton rows={5} columns={3} />;

  return (
    <table>
      {items.map(item => (
        <tr key={item.id}>
          <td>{item.title}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Pattern 2: Form with Progress
```jsx
function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (uploading) {
    return (
      <div>
        <p>Uploading...</p>
        <ProgressBar progress={progress} />
      </div>
    );
  }

  return <form>{/* Upload form */}</form>;
}
```

### Pattern 3: Grid with Skeletons
```jsx
function BuildingGrid() {
  const { buildings, loading } = useBuildings();

  if (loading) return <BuildingGridSkeleton count={6} />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {buildings.map(building => (
        <BuildingCard key={building.id} building={building} />
      ))}
    </div>
  );
}
```

### Pattern 4: Search with Memoization
```jsx
function SearchableList({ items }) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <div>
      <input 
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search..."
      />
      {filteredItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

## 🎯 Best Practices

### DO ✅
- Use skeletons for loading states
- Lazy load large components
- Memoize expensive computations
- Use custom hooks for reusable logic
- Let Prettier auto-format your code

### DON'T ❌
- Don't wrap every component in error boundary (already global)
- Don't overuse memoization (only for expensive operations)
- Don't lazy load small components (overhead not worth it)
- Don't duplicate API logic (use custom hooks)
- Don't manually format code (let Prettier handle it)

---

## 🆘 Troubleshooting

### Prettier not formatting:
1. Check if extension is installed
2. Check if `.prettierrc` exists
3. Try manual format (Ctrl+Shift+P → Format Document)
4. Check VS Code settings.json

### Error boundary not catching:
- Error boundaries only catch errors in React components
- They don't catch errors in event handlers or async code
- Use try-catch for those cases

### Lazy loading not working:
- Check console for errors
- Verify import path is correct
- Ensure component is exported as default

### Hooks not updating:
- Check if you're calling the hook functions correctly
- Verify API endpoint is working
- Check browser console for errors
- Ensure VITE_API_URL is set correctly

---

## 📚 Further Reading

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React.lazy() and Suspense](https://react.dev/reference/react/lazy)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Prettier Documentation](https://prettier.io/docs/en/)

---

**Happy coding! 🚀**
