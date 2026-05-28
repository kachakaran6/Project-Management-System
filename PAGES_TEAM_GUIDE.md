# Pages System Redesign - Migration Strategy & Team Guide

**Prepared for**: Development Team  
**Date**: May 29, 2026  
**Complexity**: High | **Impact**: High | **Risk**: Low (backward compatible)

---

## Executive Summary

The Pages module is being completely redesigned from a basic note-taking tool into a **professional, enterprise-grade collaborative document platform** comparable to Microsoft Word, Notion, and Confluence.

### Key Changes
- ✅ Professional UI/UX with modern design
- ✅ Rich text editor with advanced formatting
- ✅ Real-time collaboration
- ✅ Full version history
- ✅ Advanced search
- ✅ **ZERO breaking changes** (backward compatible)

### Timeline
- **Phase 1-2**: ✅ Complete (Schema, APIs, UI design)
- **Phase 3-4**: In Progress (Editor, Real-time)
- **Phase 5-7**: Scheduled (History, Export, Testing)
- **Target**: 8 weeks to production

### Risk Assessment
```
🟢 Data Loss Risk: MINIMAL (versioning + backups)
🟢 Breaking Changes: NONE (v1 & v2 coexist)
🟢 Performance Risk: LOW (optimized indexes, caching)
🟢 User Experience: IMPROVED (gradual rollout via feature flags)
```

---

## What's Changing?

### User Experience

#### Before
```
- Basic note editor
- Simple list view
- Limited formatting
- No collaboration
- No version history
- No search
```

#### After
```
✨ Professional document editor (Word/Notion level)
✨ Multiple view modes (grid, list, table)
✨ Rich formatting (headings, code, quotes, callouts, etc.)
✨ Real-time collaboration (live cursors, presence)
✨ Full version history with restore
✨ Advanced full-text search
✨ Export to PDF/DOCX
✨ Comments & discussions
✨ Autosave with offline support
✨ Beautiful dark mode
✨ Mobile responsive
```

### Developer Experience

#### New Capabilities
- **Rich Content**: Structured block-based content (TipTap)
- **Versioning**: Automatic snapshots + manual save points
- **Collaboration**: WebSocket-powered real-time sync
- **Search**: MongoDB full-text search + custom indexing
- **Export**: Multiple formats (PDF, DOCX, Markdown, HTML)

#### New Services
```typescript
pageServiceV2.createPageV2()              // Create with rich metadata
pageServiceV2.listPagesV2()               // Advanced filtering
pageServiceV2.createPageSnapshot()        // Version tracking
pageServiceV2.searchPages()               // FTS with filters
pageServiceV2.exportPageToPDF()           // PDF generation
pageServiceV2.addPageComment()            // Comments system
```

---

## Architecture Overview

### Data Flow

```
User Client
    ↓
[New Editor Component - pages-list-v2.tsx, editor-v2.tsx]
    ↓
[React Query Hooks - usePageQueryV2(), useUpdatePageV2()]
    ↓
[RESTful API - /api/pages/v2/...]
    ↓
[Backend Service - pageServiceV2.ts]
    ↓
[MongoDB Database]
    ├─ pages_v2 (NEW)
    ├─ page_versions (NEW)
    ├─ page_comments (NEW)
    └─ pages (OLD - maintained for backward compatibility)
    ↓
[Real-time Updates via WebSocket]
    ↓
[All Connected Clients]
```

### Key Components

```
FRONTEND                          BACKEND                          DATABASE
├─ pages-list-v2.tsx            ├─ page.controller.v2.ts         ├─ pages_v2
├─ editor-v2.tsx                ├─ pageServiceV2.ts              ├─ page_versions
├─ editor-header.tsx            ├─ page.routes.ts                ├─ page_comments
├─ editor-sidebar.tsx           ├─ export.service.ts             └─ page_sync (realtime)
├─ version-history.tsx          └─ collaboration.service.ts
├─ use-page-sync.ts (WebSocket)
├─ use-autosave.ts
└─ use-page-search.ts
```

---

## Backward Compatibility

### How It Works

#### Option 1: Parallel Deployment
```
┌─────────────────────────────────────────┐
│         API Request                     │
│  GET /api/pages/v2/:id                  │
└────────────┬────────────────────────────┘
             │
             ├─→ Check feature flag: PAGES_NEW_EDITOR=true?
             │
             ├─ YES → pageServiceV2.getPageByIdV2()
             │        (returns PageV2 document)
             │
             └─ NO → page.service.getPageById()
                     (returns legacy Page document)
```

#### Option 2: Automatic Detection
```
const page = await db.collection('pages_v2').findById(id);
if (!page) {
  // Fallback to legacy page
  const legacyPage = await db.collection('pages').findById(id);
  // Auto-migrate to V2 on next save
  await migratePage(legacyPage);
}
```

#### Option 3: Gradual Migration
```
Week 1: 10% of users → New UI (pages list)
Week 2: 50% of users → Add editor improvements
Week 3: 100% of users → Full feature release
Month 2: Disable feature flags, make new system default
```

### What's Unchanged

✅ **Authentication** - Same auth system, no changes  
✅ **Permissions** - Private/Workspace/Public logic unchanged  
✅ **Public Links** - publicId/publicSlug still work  
✅ **Task Links** - linkedTaskIds still work  
✅ **Notifications** - Activity notifications still send  
✅ **APIs** - Old endpoints still available (v1)  
✅ **Data** - All existing pages remain accessible  

### Migration Path

```
Phase 1: Deploy new code (v2 alongside v1)
Phase 2: Copy all pages to pages_v2 collection
Phase 3: Enable for subset of users (feature flag)
Phase 4: Gather feedback, fix issues
Phase 5: Enable for all users
Phase 6: After 30 days, deprecate v1 (optional)
Phase 7: Archive v1 collection (after 90 days)
```

---

## Integration Checklist

### ✅ Already Completed

- [x] Backend type definitions (`pageTypes.ts`)
- [x] Database schemas (`pageSchemaV2.ts`)
- [x] Models (`PageV2`, `PageComment`, `PageVersion`)
- [x] Service layer (`pageServiceV2.ts`)
- [x] Frontend types (`page-v2.types.ts`)
- [x] Pages list UI (`pages-list-v2.tsx`)

### 🟡 In Progress

- [ ] Backend controllers (`page.controller.v2.ts`)
- [ ] API routes (`page.routes.v2.ts`)
- [ ] Frontend hooks (`use-page-query-v2.ts`)
- [ ] Rich editor component (`editor-v2.tsx`)

### ⚪ To Do

- [ ] Real-time sync service (`realtime/page-sync.ts`)
- [ ] Version history UI (`version-history.tsx`)
- [ ] Autosave system (`use-autosave.ts`)
- [ ] Export system (`export.service.ts`)
- [ ] Search implementation
- [ ] Comments UI
- [ ] Collaboration presence
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Testing & QA

---

## File Structure

### New Backend Files
```
backend/src/
├── types/
│   └── pageTypes.ts                    ✅ Complete type definitions
├── schemas/
│   └── pageSchemaV2.ts                 ✅ Enhanced MongoDB schema
├── models/
│   ├── PageV2.ts                       ✅ PageV2 model
│   ├── PageComment.ts                  ✅ Comments model
│   └── PageVersion.ts                  ✅ Versions model
└── modules/page/
    ├── pageServiceV2.ts                ✅ Main service (all methods)
    ├── page.controller.v2.ts           ⏳ TO DO
    ├── page.routes.v2.ts               ⏳ TO DO
    ├── export.service.ts               ⏳ TO DO
    └── collaboration.service.ts        ⏳ TO DO
```

### New Frontend Files
```
client/src/
├── types/
│   └── page-v2.types.ts                ✅ Client types
└── features/pages/
    ├── components/
    │   ├── pages-list-v2.tsx           ✅ New pages list UI
    │   ├── editor-v2.tsx               ⏳ Rich editor
    │   ├── editor-header.tsx           ⏳ Header component
    │   ├── editor-sidebar.tsx          ⏳ Sidebar panels
    │   ├── version-history.tsx         ⏳ Version browser
    │   ├── version-diff.tsx            ⏳ Diff viewer
    │   ├── page-comments.tsx           ⏳ Comments panel
    │   └── presence-avatars.tsx        ⏳ Live cursors
    ├── hooks/
    │   ├── use-page-query-v2.ts        ⏳ React Query hooks
    │   ├── use-page-sync.ts            ⏳ WebSocket sync
    │   ├── use-autosave.ts             ⏳ Auto-save
    │   └── use-page-search.ts          ⏳ Search
    └── api/
        └── page-v2.api.ts             ⏳ API client methods
```

---

## Debugging & Support

### Common Issues

#### Issue: Pages not loading
```typescript
// Check if feature flag is enabled
const useNewEditor = process.env.PAGES_NEW_EDITOR === 'true';

// Check if falling back to v1
const page = pageQuery.data?.data;
console.log('Page origin:', page?.createdByPlatform); // 'v1' or 'v2'
```

#### Issue: Autosave not working
```typescript
// Check if WebSocket is connected
const [syncStatus, setSyncStatus] = useState('disconnected');

// Check if save is debounced correctly
const debouncedSave = useMemo(
  () => debounce(() => savePageContent(), 1000),
  []
);
```

#### Issue: Version history empty
```typescript
// Check if snapshots are being created
const versions = await PageVersion.find({ pageId });
console.log('Versions found:', versions.length);

// Manually trigger snapshot
await createPageSnapshot(pageId, 'Manual backup');
```

### Monitoring

```typescript
// Log page operations
createActivityLog({
  userId,
  action: 'CREATE_PAGE',
  entityType: 'Page',
  entityId: page._id,
  metadata: { title: page.title }
});

// Track editor performance
performance.mark('editor-load-start');
// ... load editor ...
performance.mark('editor-load-end');
performance.measure('editor-load', 'editor-load-start', 'editor-load-end');
```

### Test Scenarios

**Scenario 1: Create & Edit Page**
```
1. Create new page with title "Test Document"
2. Edit content (add text, formatting, code block)
3. Verify autosave indicator shows
4. Refresh page - content should persist
5. Check version history has entries
```

**Scenario 2: Multi-user Editing**
```
1. Open same page in 2 browser tabs
2. Edit in tab 1
3. Verify edit appears in tab 2 (real-time)
4. Edit in tab 2
5. Verify both changes merged correctly
6. Check version history shows both edits
```

**Scenario 3: Version Restore**
```
1. Create page with content A
2. Edit to content B (snapshot created)
3. Edit to content C
4. Restore to version B
5. Verify content is B
6. Check new version created for restore
```

---

## Performance Considerations

### Database Indexes
```typescript
// Already created in schema:
- Full-text search: { title: 'text', description: 'text', plainText: 'text' }
- Organization pages: { organizationId: 1, visibility: 1, createdAt: -1 }
- User pages: { creatorId: 1, createdAt: -1 }
- Collaboration: { activeEditorIds: 1 }
- Versions: { pageId: 1, versionNumber: -1 }

// Add monitoring for index usage
db.pages_v2.explain("executionStats").find({ ... })
```

### Caching Strategy
```typescript
// React Query cache times
staleTime: 10_000,      // 10 seconds
gcTime: 5 * 60_000,     // 5 minutes (formerly cacheTime)
refetchOnWindowFocus: false,
refetchOnReconnect: true,

// Consider Redis cache for:
- Search results
- Page view history
- Recent pages
- Collaborator presence
```

### Large Document Handling
```typescript
// Use virtualization for large documents
- Only render visible blocks
- Load blocks on-demand (intersection observer)
- Debounce content updates

// Estimated limits:
- Safe: 1k-5k blocks
- Acceptable: 5k-50k blocks (with virtualization)
- Requires optimization: 50k+ blocks
```

---

## Security Considerations

### Permission Checks
```typescript
// Every endpoint must verify:
1. User is authenticated
2. User has access to page (visibility + allowedUsers)
3. User can perform action (edit vs. view)

// Pattern:
const canEdit = page.creatorId === userId || 
                page.collaborators.some(c => 
                  c.userId === userId && c.role === 'editor'
                );
```

### API Rate Limiting
```typescript
// Suggested limits:
POST /api/pages/v2/:id/blocks       - 100/minute per user
PATCH /api/pages/v2/:id              - 60/minute per user
GET /api/pages/v2/search             - 30/minute per user

// Use existing rate limiter middleware
import { rateLimiter } from '@/middlewares/rateLimit.ts';
```

### Content Sanitization
```typescript
// Sanitize HTML on save (if needed)
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(content);

// Validate JSON content structure
const schema = Yup.object().shape({
  type: Yup.string().required(),
  content: Yup.array(),
  // ...
});
```

---

## Team Assignments

### Frontend Development
- **Pages List UI**: ✅ Complete
- **Rich Editor**: 
  - Setup TipTap + extensions
  - Build toolbar
  - Implement slash commands
- **Real-time Sync**: 
  - WebSocket integration
  - Presence indicators
  - Collaborative cursors
- **Version History**:
  - Version browser UI
  - Diff viewer
  - Restore functionality

### Backend Development
- **API Endpoints**:
  - Controllers for all CRUD operations
  - Validation & error handling
  - Permission middleware
- **Services**:
  - Collaboration sync
  - Export generation (PDF, DOCX)
  - Search indexing
- **Infrastructure**:
  - WebSocket setup
  - Database indexes verification
  - Logging & monitoring

### QA Testing
- Functional testing (all features)
- Integration testing (multi-user)
- Performance testing (large docs)
- Browser compatibility
- Mobile responsiveness
- Accessibility audit

---

## Documentation Links

| Document | Purpose |
|----------|---------|
| `PAGES_REDESIGN.md` | Full architecture & design |
| `PAGES_IMPLEMENTATION_GUIDE.md` | Implementation guide & checklist |
| `backend/src/types/pageTypes.ts` | Type definitions reference |
| `backend/src/schemas/pageSchemaV2.ts` | Database schema reference |
| `backend/src/modules/page/pageServiceV2.ts` | Service methods reference |

---

## Success Metrics

### Adoption
- [ ] 50% of users using new editor within 2 weeks
- [ ] 90% adoption within 1 month
- [ ] User satisfaction score > 4.0/5.0

### Performance
- [ ] Page load time < 1 second
- [ ] Save latency < 200ms
- [ ] Search results < 300ms
- [ ] No performance regressions

### Reliability
- [ ] 99.9% API uptime
- [ ] Zero data loss
- [ ] < 0.1% error rate
- [ ] < 5 minute MTTR

### Quality
- [ ] 0 P1 bugs
- [ ] < 5 P2 bugs
- [ ] WCAG AA accessibility
- [ ] Mobile UI tested

---

## Questions & Support

### Getting Help
1. **Architecture**: Check `PAGES_REDESIGN.md`
2. **Implementation**: Check `PAGES_IMPLEMENTATION_GUIDE.md`
3. **Types**: Check `backend/src/types/pageTypes.ts`
4. **Code Examples**: Check `pageServiceV2.ts`

### Contact
- Tech Lead: [Name]
- Product: [Name]
- QA Lead: [Name]

---

**Last Updated**: May 29, 2026  
**Status**: Ready for Integration  
**Next Step**: Start implementing backend controllers and frontend hooks
