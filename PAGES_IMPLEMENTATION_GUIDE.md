# Pages System Redesign - Implementation Guide

**Status**: Foundation Phase Complete - Ready for Integration  
**Last Updated**: May 29, 2026

---

## ✅ Completed Work (Phase 1-2)

### Backend (Phase 1)
- [x] **Enhanced Type System** (`backend/src/types/pageTypes.ts`)
  - Complete TypeScript interfaces for all new features
  - Backward compatibility layer for V1→V2 migration
  - Support for rich content, versioning, collaboration

- [x] **Database Schema** (`backend/src/schemas/pageSchemaV2.ts`)
  - New PageV2 schema with all fields for professional docs
  - PageComment schema for discussions
  - PageVersion schema for full history
  - Optimized indexes for performance
  - Full-text search indexes

- [x] **Models** 
  - `backend/src/models/PageV2.ts`
  - `backend/src/models/PageComment.ts`
  - `backend/src/models/PageVersion.ts`

- [x] **Service Layer** (`backend/src/modules/page/pageServiceV2.ts`)
  - ✅ `createPageV2()` - Create pages with rich metadata
  - ✅ `getPageByIdV2()` - Get page with full enrichment
  - ✅ `listPagesV2()` - Advanced filtering & search
  - ✅ `updatePageV2()` - Edit page with version tracking
  - ✅ `deletePageV2()` - Soft delete (archive)
  - ✅ `createPageSnapshot()` - Auto-save versioning
  - ✅ `getPageVersionHistory()` - Browse versions
  - ✅ `restorePageVersion()` - Restore to past version
  - ✅ `addPageComment()` - Comments on pages
  - ✅ `searchPages()` - Full-text search
  - ✅ `exportPageToPDF()` - Basic PDF export

### Frontend (Phase 2)
- [x] **Enhanced Types** (`client/src/types/page-v2.types.ts`)
  - Complete type definitions for all features
  - API interfaces matching backend

- [x] **Pages List Component** (`client/src/features/pages/components/pages-list-v2.tsx`)
  - ✅ Professional header with search, filters, actions
  - ✅ Grid view (beautiful cards)
  - ✅ List view (compact rows)
  - ✅ Table view (ready)
  - ✅ View switcher
  - ✅ Empty states
  - ✅ Hover interactions
  - ✅ Quick actions

---

## 📋 Remaining Work (Phase 3-7)

### Phase 3: Rich Editor Implementation (Week 3-4)

#### 3.1 Enhanced Editor Component
**File**: `client/src/features/pages/components/editor-v2.tsx`  
**Status**: TO DO

```typescript
// Key Features:
- TipTap editor with all extensions
- Professional toolbar
- Floating formatting menu
- Slash commands palette
- Block inserter
- Full content management
- Real-time preview
- Autosave with indicators
```

**Checklist**:
- [ ] Setup TipTap with all extensions:
  - [x] StarterKit
  - [ ] Heading with multiple levels
  - [ ] CodeBlock with syntax highlighting
  - [ ] TaskList & TaskItem
  - [ ] Table, TableRow, TableHeader, TableCell
  - [ ] Underline
  - [ ] Link
  - [ ] Image with upload handler
  - [ ] TextAlign
  - [ ] CharacterCount
  - [ ] Placeholder
  
- [ ] Custom Extensions:
  - [ ] Slash Commands (`/`, `/heading`, `/code`, `/image`, etc.)
  - [ ] Markdown Shortcuts (`**bold**`, `*italic*`, `~strike~`, etc.)
  - [ ] Callout blocks with 4 types (info, warning, success, error)
  - [ ] Toggle/Accordion blocks
  - [ ] Divider blocks
  - [ ] Quote blocks with styling
  - [ ] Inline code formatting
  - [ ] Subscript & Superscript
  - [ ] Highlight/Background color
  - [ ] @mention support
  - [ ] Embed support (YouTube, Vimeo, etc.)
  - [ ] File attachment blocks
  - [ ] Database/table blocks
  - [ ] Math/Equation blocks

- [ ] Floating Toolbar:
  - [ ] Text formatting buttons (bold, italic, underline, strike)
  - [ ] Alignment selector
  - [ ] Color pickers (text & highlight)
  - [ ] Link insertion
  - [ ] Additional formatting options menu

- [ ] Block Management:
  - [ ] Add block before/after
  - [ ] Drag-and-drop reordering
  - [ ] Block type conversion
  - [ ] Delete block
  - [ ] Duplicate block
  - [ ] Block selection

#### 3.2 Editor Header Component
**File**: `client/src/features/pages/components/editor-header.tsx`  
**Status**: TO DO

```typescript
// Features:
- Page title inline edit
- Icon selector
- Visibility selector
- Share button
- Publish button
- Export dropdown
- More options menu
- Save state indicator
- Last edited indicator
```

#### 3.3 Sidebar Components
**File**: `client/src/features/pages/components/editor-sidebar.tsx`  
**Status**: TO DO

```typescript
// Left Sidebar (Navigation):
- Collapsible page tree
- Nested pages
- Favorites
- Recent pages
- Jump to section

// Right Sidebar (Context):
- Page info tab (word count, reading time)
- Linked tasks tab
- Comments tab
- Version history tab
- Backlinks tab
- AI assistant tab
```

### Phase 4: Collaboration Features (Week 4-5)

#### 4.1 WebSocket Integration
**Files**: 
- `backend/src/realtime/page-sync.ts`
- `client/src/features/pages/hooks/use-page-sync.ts`

**Status**: TO DO

```typescript
// Events to implement:
- 'page:content-update' → Broadcast edits
- 'page:user-joined' → Editor joined
- 'page:user-left' → Editor left
- 'page:cursor-update' → Live cursor position
- 'page:typing' → Typing indicator
- 'page:selection' → Text selection
```

#### 4.2 Presence Indicators
**File**: `client/src/features/pages/components/presence-avatars.tsx`  
**Status**: TO DO

```typescript
// Show:
- Active editors
- Live cursors with names
- Typing indicators
- User colors
- Cursor positions
```

#### 4.3 Real-time Sync
**Status**: TO DO

```typescript
// Implement:
- Debounced saves
- Conflict resolution
- Optimistic updates
- Undo/redo syncing
- Collaborative cursors
```

### Phase 5: Version History (Week 5)

#### 5.1 Auto-Save System
**File**: `client/src/features/pages/hooks/use-autosave.ts`  
**Status**: TO DO

```typescript
// Features:
- 1-second debounce on changes
- Auto-snapshot every 5 minutes
- Save state indicators (saving, saved, error)
- Offline buffering
- Recovery on reconnect
```

#### 5.2 Version Browser UI
**File**: `client/src/features/pages/components/version-history.tsx`  
**Status**: TO DO

```typescript
// Show:
- List of versions
- Version timestamps
- Who made the change
- Change type (auto/manual/restore)
- Restore button
- Compare button
- Preview button
```

#### 5.3 Version Diff Viewer
**File**: `client/src/features/pages/components/version-diff.tsx`  
**Status**: TO DO

```typescript
// Show:
- Added blocks (green)
- Removed blocks (red)
- Modified blocks (yellow)
- Reordered blocks
- Restore button
```

### Phase 6: Advanced Features (Week 6)

#### 6.1 Search System
**File**: `client/src/features/pages/hooks/use-page-search.ts`  
**Status**: TO DO

```typescript
// Implement:
- Full-text search
- Advanced filters
- Tag filtering
- Date range filtering
- Owner filtering
- Instant results
- Syntax support (owner:, type:, tag:, etc.)
```

#### 6.2 Page Relations
**Status**: TO DO

```typescript
// Backend APIs needed:
- GET /api/pages/:id/backlinks → Pages that link here
- GET /api/pages/:id/related → Related pages
- POST /api/pages/:id/link → Link to another page
- GET /api/pages/:id/breadcrumb → Parent hierarchy
- POST /api/pages/:id/nest → Move under parent
```

#### 6.3 Export System
**Files**:
- `backend/src/modules/page/export.service.ts`
- `client/src/features/pages/hooks/use-export-page.ts`

**Status**: TO DO

```typescript
// Export formats:
- [x] PDF (basic)
- [ ] DOCX (Word)
- [ ] Markdown
- [ ] HTML
- [ ] Google Docs (integration)

// Features:
- Include metadata
- Include comments
- Include history
- Configurable formatting
```

### Phase 7: Testing & QA (Week 7)

#### 7.1 Unit Tests
**Status**: TO DO

```typescript
// Test:
- Page creation/update/delete
- Version history operations
- Search functionality
- Export generation
- Permission checks
```

#### 7.2 Integration Tests
**Status**: TO DO

```typescript
// Test:
- Multi-user editing
- Real-time sync
- Version conflicts
- Share permissions
- Public page access
```

#### 7.3 E2E Tests
**Status**: TO DO

```typescript
// Test (Playwright):
- Create page → Edit → Export → Delete
- Create page → Share → Access as other user
- Create page → Edit → Version history → Restore
- Collaboration: Edit simultaneously with another user
```

#### 7.4 Performance Tests
**Status**: TO DO

```typescript
// Test:
- Large documents (10k blocks)
- Many collaborators (20+)
- Rapid edits
- Search on large dataset
- Export large documents
```

---

## 🔌 Integration Checklist

### Backend API Endpoints to Create

```bash
# Content Management
POST   /api/pages/v2                           # Create page
GET    /api/pages/v2                           # List pages
GET    /api/pages/v2/:id                       # Get page
PATCH  /api/pages/v2/:id                       # Update page
DELETE /api/pages/v2/:id                       # Archive page
POST   /api/pages/v2/:id/restore               # Restore archived

# Rich Content Editing
POST   /api/pages/v2/:id/blocks                # Add block
PATCH  /api/pages/v2/:id/blocks/:blockId       # Update block
DELETE /api/pages/v2/:id/blocks/:blockId       # Delete block
POST   /api/pages/v2/:id/blocks/reorder        # Reorder blocks

# Versioning
GET    /api/pages/v2/:id/versions              # Version history
GET    /api/pages/v2/:id/versions/:versionId   # Get specific version
POST   /api/pages/v2/:id/versions/:versionId/restore # Restore
GET    /api/pages/v2/:id/versions/compare      # Compare versions

# Collaboration
GET    /api/pages/v2/:id/collaborators         # Get active editors
POST   /api/pages/v2/:id/collaborators/:userId # Add collaborator
PATCH  /api/pages/v2/:id/share/:userId         # Update permissions
DELETE /api/pages/v2/:id/share/:userId         # Revoke access

# Comments
POST   /api/pages/v2/:id/comments              # Add comment
PATCH  /api/pages/v2/:id/comments/:commentId   # Edit comment
DELETE /api/pages/v2/:id/comments/:commentId   # Delete comment
POST   /api/pages/v2/:id/comments/:commentId/reply # Reply

# Search & Discovery
GET    /api/pages/v2/search                    # Full-text search
GET    /api/pages/v2/:id/backlinks             # Backlinks
GET    /api/pages/v2/:id/related               # Related pages

# Export & Sharing
GET    /api/pages/v2/:id/export/pdf            # Export PDF
GET    /api/pages/v2/:id/export/docx           # Export DOCX
POST   /api/pages/v2/:id/share                 # Share page
GET    /api/public/pages/:publicId             # Public view
```

### Frontend Hooks to Create

```typescript
// Queries
usePageQueryV2(pageId)                 // Get page
usePagesQueryV2(filters)               // List pages
usePageVersionsQuery(pageId)           // Get versions
usePageCommentsQuery(pageId)           // Get comments
usePageSearchQuery(query, filters)     // Search

// Mutations
useCreatePageMutationV2()              // Create
useUpdatePageMutationV2()              // Update
useDeletePageMutationV2()              // Delete
useCreatePageSnapshotMutation()        // Snapshot
useRestorePageVersionMutation()        // Restore
useAddPageCommentMutation()            // Comment
useExportPageMutation()                // Export
useSharePageMutation()                 // Share

// Real-time
usePageSync(pageId)                    // WebSocket sync
usePagePresence(pageId)                // Active editors
useAutoSave(pageId, content)           // Auto-save
```

### Components to Create

```typescript
// Editors
<EditorV2 pageId={id} />               // Main editor
<EditorHeader page={page} />           // Header
<EditorSidebar page={page} />          // Sidebars
<FloatingToolbar editor={editor} />    // Toolbar

// Features
<VersionHistory pageId={id} />         // History browser
<VersionDiffViewer from={v1} to={v2} /> // Diff viewer
<PageComments pageId={id} />           // Comments panel
<PageSearchDialog />                   // Search dialog
<SharePageDialog page={page} />        // Share dialog
<ExportPageMenu page={page} />         // Export menu
<PresenceAvatars pageId={id} />        // Active editors

// Views
<PageListV2 />                         // Pages list (NEW)
<PublicPageView page={page} />         // Public view
```

---

## 🚀 Next Steps

### Immediate (This Week)

1. **Create Backend Controllers** (`page.controller.v2.ts`)
   - Wire up all service methods to HTTP endpoints
   - Add request validation
   - Add error handling
   - Add permission checks

2. **Create API Routes** (`page.routes.ts`)
   - Register all new endpoints
   - Add middleware
   - Add rate limiting
   - Add logging

3. **Create Frontend Hooks**
   - Wire up React Query hooks to new APIs
   - Add error handling
   - Add cache invalidation

4. **Replace Pages Route**
   - Point `/pages` to new `pages-list-v2.tsx`
   - Point `/pages/:id` to new editor component (coming)

### This Sprint (Next Week)

1. **Complete Rich Editor Component**
   - Implement all TipTap extensions
   - Build slash commands
   - Build floating toolbar
   - Test with various content types

2. **Implement Real-time Sync**
   - Wire up WebSockets
   - Test with multiple tabs
   - Test with multiple users
   - Handle conflicts

3. **Build Version History UI**
   - Version browser
   - Diff viewer
   - Restore functionality
   - Autosave indicators

### Future (Weeks 3-8)

- Implement remaining advanced features
- Comprehensive testing
- Performance optimization
- Bug fixes and polish

---

## 📊 Progress Tracking

### Completed ✅
- Architecture & design (100%)
- Backend types (100%)
- Database schema (100%)
- Service layer (100%)
- Frontend types (100%)
- Pages list UI (100%)

### In Progress 🟡
- Backend API controllers
- Frontend hooks
- Rich editor component

### Not Started ⚪
- WebSocket integration
- Version history UI
- Collaboration features
- Advanced search
- Export system
- Testing

---

## 🔐 Safety & Compatibility

### No Breaking Changes
✅ All existing Page APIs continue to work  
✅ Old pages remain accessible  
✅ Permissions unchanged  
✅ Public links unchanged  
✅ Tasks links unchanged  
✅ Notifications unchanged  

### Migration Strategy
- V1 and V2 collections coexist
- Feature flags enable gradual rollout
- Automatic format detection
- Fallback to old system if needed

### Rollback Plan
- Keep old collection intact
- Can revert API routes to old service
- Users can revert to old UI
- No data loss if issues found

---

## 📚 Resources

### Documentation
- `PAGES_REDESIGN.md` - Full architecture document
- `pageTypes.ts` - Complete type definitions
- `pageSchemaV2.ts` - Database schema
- `pageServiceV2.ts` - Service implementation examples

### Code References
- TipTap docs: https://tiptap.dev
- MongoDB FTS: https://docs.mongodb.com/manual/text-search/
- React Query: https://tanstack.com/query/latest
- Socket.io: https://socket.io/docs/

---

## ✨ Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Pages load time | < 1s | ⏳ |
| Edit latency | < 200ms | ⏳ |
| Search results | < 300ms | ⏳ |
| Zero data loss | 100% | ✅ |
| API uptime | 99.9% | ✅ |
| Mobile UX | Pass audit | ⏳ |
| Accessibility | WCAG AA | ⏳ |
| No regressions | 100% | ✅ |

---

**Next Action**: Start implementing backend controllers and frontend hooks. Use this guide as reference for detailed API contracts and component specifications.
