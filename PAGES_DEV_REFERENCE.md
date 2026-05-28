# Pages System V2 - Developer Quick Reference

**For developers extending the Pages system**

---

## Quick Start

### Backend: Add a New API Endpoint

```typescript
// 1. Add service method in pageServiceV2.ts
export const getPageStats = async (pageId: string) => {
  const page = await PageV2.findById(pageId);
  return {
    wordCount: page.wordCount,
    blockCount: page.blockCount,
    collaborators: page.collaborators.length,
    lastEditedAt: page.lastEditedAt,
  };
};

// 2. Add controller in page.controller.v2.ts
export const getPageStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stats = await pageServiceV2.getPageStats(id);
  return successResponse(res, stats, 'Page stats retrieved');
});

// 3. Add route in page.routes.v2.ts
router.get('/pages/:id/stats', getPageStats);

// 4. Create frontend hook in use-pages-query-v2.ts
export function usePageStatsQuery(pageId: string) {
  return useQuery({
    queryKey: pagesQueryKeys.stats(pageId),
    queryFn: () => pageApi.getPageStats(pageId),
    enabled: Boolean(pageId),
  });
}

// 5. Use in component
const { data: stats } = usePageStatsQuery(pageId);
<p>Words: {stats?.wordCount}</p>
```

### Frontend: Add a New UI Component

```typescript
// 1. Create component (components/page-stats-panel.tsx)
export function PageStatsPanel({ pageId }) {
  const { data: stats, isLoading } = usePageStatsQuery(pageId);
  
  if (isLoading) return <Skeleton className="h-20" />;
  
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
      <div>Words: {stats?.wordCount}</div>
      <div>Blocks: {stats?.blockCount}</div>
      <div>Collaborators: {stats?.collaborators}</div>
    </div>
  );
}

// 2. Add to editor sidebar
<ContextSidebar>
  <PageStatsPanel pageId={pageId} />
</ContextSidebar>
```

---

## Common Patterns

### Pattern 1: Create with Metadata

```typescript
// Service (backend)
export const createPageWithTemplate = async (
  data: { title: string; templateId: string; creatorId: string }
) => {
  const template = await getTemplate(data.templateId);
  const page = await createPageV2({
    ...data,
    content: template.content,
    icon: template.icon,
    tags: template.tags,
  });
  return page;
};

// Hook (frontend)
export function useCreatePageFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => pageApi.createFromTemplate(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: pagesQueryKeys.all });
      return created;
    },
  });
}

// Component
const { mutate: createFromTemplate } = useCreatePageFromTemplate();
const handleUseTemplate = () => {
  createFromTemplate(
    { title: 'My Doc', templateId: 'template-1' },
    {
      onSuccess: (page) => router.push(`/pages/${page.id}`),
    }
  );
};
```

### Pattern 2: Real-time Sync

```typescript
// Hook
export function usePageSync(pageId: string) {
  useEffect(() => {
    const socket = getSocket(); // Your socket instance
    
    const handleUpdate = (data) => {
      queryClient.setQueryData(
        pagesQueryKeys.detail(pageId),
        (old) => ({ ...old, ...data })
      );
    };
    
    socket.on(`page:${pageId}:update`, handleUpdate);
    socket.emit(`page:${pageId}:subscribe`);
    
    return () => {
      socket.off(`page:${pageId}:update`, handleUpdate);
      socket.emit(`page:${pageId}:unsubscribe`);
    };
  }, [pageId]);
}

// Component
const PageEditor = ({ pageId }) => {
  usePageSync(pageId); // Listen for updates
  const { data: page } = usePageQuery(pageId);
  
  const handleSave = (content) => {
    // Optimistic update
    queryClient.setQueryData(pagesQueryKeys.detail(pageId), (old) => ({
      ...old,
      content,
    }));
    
    // Send to server + broadcast
    socket.emit('page:update', { pageId, content });
  };
};
```

### Pattern 3: Version Control

```typescript
// Service
export const savePageWithVersion = async (
  pageId: string,
  content: JSONContent,
  description?: string
) => {
  // Update page
  await updatePageV2(pageId, { content });
  
  // Create snapshot
  const version = await createPageSnapshot(pageId, description);
  
  return version;
};

// Hook
export function useSaveWithVersion() {
  return useMutation({
    mutationFn: ({ pageId, content, description }) =>
      pageApi.saveWithVersion(pageId, content, description),
    onSuccess: (version) => {
      showNotification(`Version ${version.versionNumber} saved`);
    },
  });
}

// Component
const { mutate: save } = useSaveWithVersion();
const handleSave = () => {
  save({
    pageId,
    content,
    description: 'Save point before major changes',
  });
};
```

### Pattern 4: Search with Filters

```typescript
// Service
export const searchPagesAdvanced = async (
  query: string,
  filters: {
    tags?: string[];
    createdAfter?: Date;
    visibility?: PageVisibility[];
  }
) => {
  return searchPages(query, filters);
};

// Hook
export function useAdvancedPageSearch(query: string, filters) {
  return useQuery({
    queryKey: pagesQueryKeys.search(query, filters),
    queryFn: () => pageApi.searchAdvanced(query, filters),
    enabled: query.length > 2,
    staleTime: 30_000,
  });
}

// Component
const { data: results } = useAdvancedPageSearch(query, {
  tags: ['design'],
  visibility: ['PUBLIC', 'WORKSPACE'],
});
```

---

## Error Handling

### Backend Error Pattern

```typescript
export const deletePageV2 = async (pageId: string, userId: string) => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);
  
  const page = await PageV2.findById(id);
  if (!page) throw new AppError('Page not found', 404);
  
  if (page.creatorId.toString() !== userId) {
    throw new AppError(
      'You do not have permission to delete this page',
      403
    );
  }
  
  page.isArchived = true;
  await page.save();
  
  return page;
};
```

### Frontend Error Handling

```typescript
export function useDeletePageMutationV2() {
  return useMutation({
    mutationFn: (pageId) => pageApi.deletePage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pagesQueryKeys.all });
      toast.success('Page archived');
    },
    onError: (error: AxiosError) => {
      const message = error.response?.data?.message || 'Failed to delete page';
      toast.error(message);
      
      // Log for debugging
      console.error('Delete error:', {
        status: error.response?.status,
        message,
        data: error.response?.data,
      });
    },
  });
}
```

---

## Testing

### Unit Test Example

```typescript
describe('pageServiceV2', () => {
  it('should create page with metadata', async () => {
    const page = await createPageV2({
      title: 'Test',
      content: '<p>Hello</p>',
      creatorId: userId,
    });
    
    expect(page.title).toBe('Test');
    expect(page.wordCount).toBeGreaterThan(0);
    expect(page.createdByPlatform).toBe('v2');
  });
  
  it('should extract plain text correctly', () => {
    const html = '<p>Hello <b>World</b></p>';
    const text = extractPlainText(html);
    
    expect(text).toBe('Hello World');
  });
});
```

### Integration Test Example

```typescript
describe('Pages API', () => {
  it('should create and retrieve page', async () => {
    // Create
    const created = await request(app)
      .post('/api/pages/v2')
      .send({ title: 'Test', content: '<p></p>' });
    
    expect(created.status).toBe(201);
    const pageId = created.body.data.id;
    
    // Retrieve
    const retrieved = await request(app)
      .get(`/api/pages/v2/${pageId}`);
    
    expect(retrieved.status).toBe(200);
    expect(retrieved.body.data.title).toBe('Test');
  });
});
```

---

## Debugging Tips

### Check Page Origin

```typescript
// See if page is V1 or V2
const page = await PageV2.findById(pageId);
console.log('Platform:', page.createdByPlatform); // 'v1' or 'v2'
console.log('Has new fields:', page.wordCount, page.blocks);
```

### Monitor Saves

```typescript
// Add debug logging
if (process.env.DEBUG_PAGES) {
  pageQuery.onSuccess((data) => {
    console.log('Page loaded:', {
      id: data.id,
      title: data.title,
      wordCount: data.wordCount,
      lastEditedAt: data.lastEditedAt,
    });
  });
}
```

### Check WebSocket Connection

```typescript
// In browser console
const socket = window.socket;
console.log('Connected:', socket.connected);
console.log('Subscribed:', Object.keys(socket._events));

// Subscribe to page updates
socket.emit('page:subscribe', { pageId });
socket.on('page:update', (data) => console.log('Update:', data));
```

---

## Database Queries

### Find High-Traffic Pages

```javascript
// MongoDB
db.pages_v2.aggregate([
  {
    $group: {
      _id: '$_id',
      title: { $first: '$title' },
      updateCount: { $sum: 1 },
      lastUpdate: { $max: '$updatedAt' }
    }
  },
  { $sort: { updateCount: -1 } },
  { $limit: 10 }
])
```

### Find Orphaned Versions

```javascript
db.page_versions.aggregate([
  {
    $lookup: {
      from: 'pages_v2',
      localField: 'pageId',
      foreignField: '_id',
      as: 'page'
    }
  },
  {
    $match: { page: { $size: 0 } }
  }
])
```

### Check Index Usage

```javascript
db.pages_v2.aggregate([
  { $indexStats: {} }
])
```

---

## Performance Optimization Checklist

- [ ] Add database indexes (done in schema)
- [ ] Implement React Query caching
- [ ] Use debouncing for frequent updates
- [ ] Implement lazy loading for large documents
- [ ] Add pagination to lists
- [ ] Compress exported PDFs
- [ ] Cache search results
- [ ] Monitor bundle size
- [ ] Profile with React DevTools
- [ ] Test with large documents (10k+ blocks)

---

## Deployment Checklist

- [ ] Run all tests
- [ ] Check for console errors
- [ ] Verify database indexes exist
- [ ] Test feature flags
- [ ] Test fallback to V1
- [ ] Monitor error rates
- [ ] Check API response times
- [ ] Verify WebSocket connections
- [ ] Test on multiple browsers
- [ ] Test on mobile

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Pages load slowly | Check indexes, enable pagination, profile queries |
| Real-time updates not working | Check WebSocket connection, verify socket emissions |
| Version history empty | Ensure snapshots are triggered, check change tracking |
| Search returns no results | Verify full-text index, check plainText field |
| Export fails | Validate content format, check PDFKit setup |
| Mobile UI broken | Use responsive classes, test on actual device |
| Permission errors | Verify user ID matches creatorId or allowedUsers |
| Out of memory | Use virtualization for large documents, clear caches |

---

## Resources

- **API Docs**: Check inline JSDoc comments in services
- **Type Definitions**: `backend/src/types/pageTypes.ts`
- **Schemas**: `backend/src/schemas/pageSchemaV2.ts`
- **Architecture**: `PAGES_REDESIGN.md`
- **Implementation**: `PAGES_IMPLEMENTATION_GUIDE.md`

---

**Last Updated**: May 29, 2026  
**Audience**: Backend & Frontend Developers  
**Level**: Intermediate to Advanced
