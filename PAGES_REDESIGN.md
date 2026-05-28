# Pages System - Complete Professional Redesign

**Status**: Planning & Architecture Phase  
**Version**: 1.0  
**Last Updated**: May 29, 2026

---

## Executive Summary

This document outlines the complete architectural redesign of the Pages module from a basic note-taking system into a professional, enterprise-grade collaborative document platform comparable to **Microsoft Word**, **Notion**, **Confluence**, **Craft**, and **ClickUp Docs**.

### Current State Problems

| Aspect | Issue | Impact |
|--------|-------|--------|
| **UI/UX** | Outdated, non-professional appearance | Poor adoption, feels broken |
| **Editor** | Minimal formatting, broken toolbar | Limited functionality |
| **Content** | Simple string storage, no structure | Can't support advanced features |
| **Collaboration** | No real-time features | No multi-user editing |
| **Features** | Missing core functionality | Not production-ready |
| **Performance** | No optimization | Slow with large documents |

### Redesign Goals

✅ **Professional Grade**: Premium UI/UX comparable to market leaders  
✅ **Feature Rich**: Full editor capabilities (formatting, blocks, media, embeds)  
✅ **Collaborative**: Real-time editing, presence, comments  
✅ **Performant**: Handle large documents, thousands of blocks  
✅ **Safe**: Zero breaking changes to existing systems  
✅ **Complete**: No fake features - everything fully functional  

---

## Architecture Overview

### Layer 1: Data Model Enhancement

#### Current Schema (Inadequate)
```typescript
interface Page {
  _id: ObjectId;
  title: string;           // Simple text
  content: string;         // Plain HTML/serialized
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  creatorId: ObjectId;
  allowedUsers: ObjectId[];
  publicId?: string;
  publicSlug?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### New Schema (Enhanced)
```typescript
interface PageV2 {
  // Identity
  _id: ObjectId;
  publicId: string;        // Shareable ID
  publicSlug: string;      // URL-friendly slug
  organizationId: ObjectId; // Multi-workspace support

  // Content & Structure
  title: string;
  description: string;      // NEW: Page summary
  icon: string;             // NEW: Emoji/icon
  coverUrl: string;         // NEW: Cover image
  
  // Rich Content (Block-based)
  blocks: Block[];           // NEW: Structured blocks
  content: JSONContent;      // TipTap serialized format
  plainText: string;         // NEW: Full-text search index
  wordCount: number;         // NEW: Word count
  readingTimeSeconds: number; // NEW: Est. reading time

  // Versioning & History
  version: number;
  versionHistory: PageVersion[]; // NEW: Full history
  lastVersionId: ObjectId;        // NEW: Link to last snapshot

  // Collaboration
  collaborators: PageCollaborator[]; // NEW: Active editors
  activeEditorIds: ObjectId[];      // NEW: Currently editing
  lastActiveEditor: ObjectId;       // NEW: Last person to edit
  
  // Relations
  parentPageId: ObjectId;    // NEW: Nested pages
  childPageIds: ObjectId[];  // NEW: Sub-pages
  linkedTaskIds: ObjectId[]; // NEW: Related tasks
  linkedPageIds: ObjectId[]; // NEW: Backlinks/references
  linkedProjectIds: ObjectId[]; // NEW: Related projects
  
  // Access Control
  visibility: PageVisibility;
  allowedUsers: ObjectId[];
  sharedWith: PageShare[];    // NEW: Detailed sharing
  
  // Metadata
  creatorId: ObjectId;
  creator: UserRef;           // NEW: Denormalized author
  tags: string[];             // NEW: Categorization
  isArchived: boolean;        // NEW: Soft delete
  isFavorite: boolean;        // NEW: Bookmarking
  isPinned: boolean;          // NEW: Pinning
  
  // Search & Discovery
  searchIndex: string;        // NEW: Full-text search
  updatedAt: Date;
  createdAt: Date;
  
  // Settings
  allowComments: boolean;     // NEW: Discussion toggle
  allowSharing: boolean;      // NEW: Sharing control
  showInPublic: boolean;      // NEW: Directory listing
}

interface Block {
  id: string;
  type: 'text' | 'heading' | 'paragraph' | 'image' | 'code' | 'quote' | 'table' | 'divider' | 'callout' | 'toggle' | 'embed' | 'database' | 'mention' | 'task';
  content: string;
  metadata: Record<string, any>;
  children?: Block[];
  position: number;
}

interface PageVersion {
  _id: ObjectId;
  pageId: ObjectId;
  version: number;
  title: string;
  content: JSONContent;
  plainText: string;
  createdBy: ObjectId;
  createdAt: Date;
  changeDescription?: string;
  snapshot: JSONContent; // Full snapshot for restore
}

interface PageCollaborator {
  userId: ObjectId;
  role: 'viewer' | 'commenter' | 'editor' | 'owner';
  addedAt: Date;
  lastAccessedAt: Date;
}

interface PageShare {
  id: string;
  pageId: ObjectId;
  sharedBy: ObjectId;
  sharedWith: ObjectId;
  role: 'viewer' | 'editor';
  expiresAt?: Date;
  createdAt: Date;
}
```

---

## Implementation Phases

### Phase 1: Backend Schema & API (Week 1-2)

#### 1.1 Database Schema Extension
- [ ] Create `PageV2` collection
- [ ] Create `PageVersion` collection
- [ ] Create `PageComment` collection
- [ ] Create migration from `Page` to `PageV2`
- [ ] Create indexes for search, visibility, dates
- [ ] Create archive/restore functions

#### 1.2 Enhanced API Endpoints

**Content Management**
```
POST   /api/pages                           # Create page
GET    /api/pages                           # List pages (with filters)
GET    /api/pages/:id                       # Get page detail
PATCH  /api/pages/:id                       # Update page
DELETE /api/pages/:id                       # Archive page
POST   /api/pages/:id/restore               # Restore archived page
POST   /api/pages/:id/duplicate             # Duplicate page
POST   /api/pages/:id/move                  # Move to nested location
```

**Rich Editing**
```
POST   /api/pages/:id/blocks                # Add block
PATCH  /api/pages/:id/blocks/:blockId       # Update block
DELETE /api/pages/:id/blocks/:blockId       # Delete block
POST   /api/pages/:id/blocks/reorder        # Reorder blocks
POST   /api/pages/:id/upload-image          # Upload image to block
```

**Versioning**
```
GET    /api/pages/:id/versions              # Version history
GET    /api/pages/:id/versions/:versionId   # Get specific version
POST   /api/pages/:id/versions/:versionId/restore # Restore version
GET    /api/pages/:id/versions/compare      # Compare versions
```

**Collaboration**
```
GET    /api/pages/:id/collaborators         # Get active editors
POST   /api/pages/:id/collaborators/:userId # Add collaborator
PATCH  /api/pages/:id/collaborators/:userId # Update collaborator role
DELETE /api/pages/:id/collaborators/:userId # Remove collaborator
```

**Search & Discovery**
```
GET    /api/pages/search                    # Full-text search
GET    /api/pages/related/:id               # Related pages
GET    /api/pages/backlinks/:id             # Backlinks
GET    /api/pages/trending                  # Trending pages
GET    /api/pages/recent                    # Recently modified
```

**Sharing & Access**
```
POST   /api/pages/:id/share                 # Share with user
PATCH  /api/pages/:id/share/:shareId        # Update share settings
DELETE /api/pages/:id/share/:shareId        # Revoke share
GET    /api/pages/shared-with-me            # Pages shared with user
```

**Comments & Discussions**
```
POST   /api/pages/:id/comments              # Add comment
PATCH  /api/pages/:id/comments/:commentId   # Edit comment
DELETE /api/pages/:id/comments/:commentId   # Delete comment
POST   /api/pages/:id/comments/:commentId/reply # Reply to comment
```

**Export & Integration**
```
GET    /api/pages/:id/export/pdf            # Export as PDF
GET    /api/pages/:id/export/docx           # Export as DOCX
GET    /api/pages/:id/export/markdown       # Export as Markdown
GET    /api/pages/:id/print                 # Print-ready HTML
```

**Public Pages**
```
GET    /api/public/pages/:publicId          # Public page view
GET    /api/public/pages/:publicId/related  # Related public pages
```

---

### Phase 2: Frontend Components Redesign (Week 2-3)

#### 2.1 Pages List Screen

**Header Section**
```tsx
<header className="sticky top-0 z-40 backdrop-blur bg-background/80">
  <div className="flex items-center justify-between px-6 py-4">
    
    {/* Left: Search & Filters */}
    <div className="flex gap-3 flex-1">
      <SearchInput 
        placeholder="Search pages..." 
        onSearch={handleSearch}
        onAdvancedSearch={handleAdvancedSearch}
      />
      
      <FilterDropdown 
        filters={['visibility', 'owner', 'date', 'tags']}
        onFilter={handleFilter}
      />
      
      <SortDropdown 
        options={['recent', 'title', 'owner', 'created']}
        onSort={handleSort}
      />
    </div>
    
    {/* Center: View Selector */}
    <div className="flex gap-2 mx-6">
      <ViewToggle 
        views={['grid', 'list', 'table', 'compact']}
        current={view}
        onChange={setView}
      />
    </div>
    
    {/* Right: Actions */}
    <div className="flex gap-2">
      <WorkspaceSelector current={workspace} onChange={setWorkspace} />
      <CreatePageButton onClick={handleCreatePage} />
    </div>
  </div>
</header>
```

**Page Card (Grid View)**
```tsx
<PageCard className="group relative">
  {/* Cover Image */}
  <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden">
    <img src={page.coverUrl} alt="cover" />
  </div>
  
  {/* Badge Bar */}
  <div className="absolute top-3 right-3 flex gap-2">
    <VisibilityBadge visibility={page.visibility} />
    <FavoriteButton page={page} />
  </div>
  
  {/* Content */}
  <div className="p-4">
    {/* Icon + Title */}
    <div className="flex items-start gap-3 mb-3">
      <PageIcon emoji={page.icon} />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base truncate">{page.title}</h3>
        {page.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {page.description}
          </p>
        )}
      </div>
    </div>
    
    {/* Metadata Row */}
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
      <div className="flex items-center gap-2">
        <Avatar size="sm" src={page.creator.avatarUrl} />
        <span>{page.creator.firstName}</span>
      </div>
      <span>{formatDate(page.updatedAt)}</span>
    </div>
    
    {/* Tags & Stats */}
    <div className="flex items-center justify-between">
      <div className="flex gap-1 flex-wrap">
        {page.tags.slice(0, 2).map(tag => (
          <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {page.linkedTaskIds.length} tasks
      </span>
    </div>
    
    {/* Hover Actions */}
    <div className="opacity-0 group-hover:opacity-100 absolute bottom-3 left-3 right-3 flex gap-2">
      <EditButton onClick={() => editPage(page.id)} />
      <ShareButton onClick={() => shareOpen(page)} />
      <MoreMenu page={page} />
    </div>
  </div>
</PageCard>
```

**Page Row (List View)**
```tsx
<PageRow className="px-6 py-3 hover:bg-muted/50 border-b transition-colors">
  <div className="flex items-center gap-4 flex-1">
    {/* Checkbox for selection */}
    <Checkbox />
    
    {/* Icon + Title */}
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <PageIcon emoji={page.icon} size="sm" />
      <div className="min-w-0">
        <h4 className="font-medium truncate">{page.title}</h4>
        {page.description && (
          <p className="text-xs text-muted-foreground truncate">
            {page.description}
          </p>
        )}
      </div>
    </div>
    
    {/* Metadata Columns */}
    <div className="flex items-center gap-8 text-sm text-muted-foreground">
      <span className="w-24">{page.creator.firstName}</span>
      <span className="w-24">{formatDate(page.updatedAt)}</span>
      <VisibilityBadge visibility={page.visibility} />
      <span className="w-16">{page.linkedTaskIds.length}</span>
    </div>
  </div>
  
  {/* Row Actions */}
  <MoreMenu page={page} />
</PageRow>
```

#### 2.2 Page Editor Rebuild

```tsx
<div className="flex h-screen w-full bg-background">
  {/* Left Sidebar - Navigation (Collapsible) */}
  <PageSidebar 
    open={sidebarOpen}
    onToggle={setSidebarOpen}
    pageId={pageId}
    nestedPages={nestedPages}
    onNavigate={handleNavigate}
  />
  
  {/* Main Editor */}
  <div className="flex-1 flex flex-col">
    {/* Sticky Header */}
    <EditorHeader 
      page={page}
      onTitleChange={handleTitleChange}
      onVisibilityChange={handleVisibilityChange}
      saveState={saveState}
      onShare={handleShare}
      onPublish={handlePublish}
      onExport={handleExport}
      onMore={handleMore}
    />
    
    {/* Editor Canvas */}
    <div className="flex-1 overflow-auto">
      <EditorContainer maxWidth="900px" centered>
        {/* Page Cover */}
        <PageCover 
          url={page.coverUrl} 
          onUpload={handleUploadCover}
          onRemove={handleRemoveCover}
        />
        
        {/* Page Icon & Title */}
        <PageTitleEditor 
          icon={page.icon}
          title={page.title}
          onIconChange={handleIconChange}
          onTitleChange={handleTitleChange}
        />
        
        {/* Rich Editor */}
        <RichEditor
          content={page.content}
          onChange={handleContentChange}
          onSlashCommand={handleSlashCommand}
          onMention={handleMention}
          collaborators={collaborators}
          comments={comments}
        />
      </EditorContainer>
    </div>
  </div>
  
  {/* Right Sidebar - Context Panels */}
  <ContextSidebar 
    open={contextSidebarOpen}
    onToggle={setContextSidebarOpen}
    tabs={['info', 'linked-tasks', 'comments', 'history', 'backlinks']}
  >
    {/* Tab: Page Info */}
    <PageInfo 
      page={page}
      wordCount={wordCount}
      readingTime={readingTime}
      lastModifiedBy={lastModifiedBy}
    />
    
    {/* Tab: Linked Tasks */}
    <PageLinkedTasks tasks={page.linkedTaskIds} />
    
    {/* Tab: Comments */}
    <PageComments 
      comments={comments}
      onAdd={handleAddComment}
      onReply={handleReplyComment}
    />
    
    {/* Tab: History */}
    <PageHistory 
      versions={versions}
      onRestore={handleRestoreVersion}
      onCompare={handleCompareVersions}
    />
    
    {/* Tab: Backlinks */}
    <PageBacklinks 
      backlinks={backlinks}
      onNavigate={handleNavigateBacklink}
    />
  </ContextSidebar>
</div>
```

---

### Phase 3: Rich Editor Implementation (Week 3-4)

#### 3.1 Editor Extensions

**Formatting Extensions**
- ✅ StarterKit (paragraph, bold, italic, etc.)
- ✅ Heading (H1-H6)
- ✅ CodeBlock with syntax highlighting
- ✅ TaskList & TaskItem
- ✅ Table, TableRow, TableHeader, TableCell
- ✅ Underline
- ✅ Link with menu
- ✅ Image with upload
- ✅ TextAlign
- ✅ CharacterCount
- ✅ Placeholder

**Custom Extensions**
- [ ] Slash Commands (/, /heading, /table, /image, etc.)
- [ ] Markdown Shortcuts (@mention, #tag, [[link]], etc.)
- [ ] Callout blocks (info, warning, success, error)
- [ ] Toggle/Accordion blocks
- [ ] Divider/Separator
- [ ] Quote blocks
- [ ] Inline code with syntax highlighting
- [ ] Subscript & Superscript
- [ ] Highlight/Background color
- [ ] Mention with @
- [ ] Embed (YouTube, Vimeo, CodePen, etc.)
- [ ] Attached file blocks
- [ ] Database table blocks
- [ ] Timeline blocks
- [ ] Kanban board blocks
- [ ] Equation/Math blocks

#### 3.2 Toolbar Implementation

```tsx
<FloatingToolbar 
  className="flex items-center gap-1 p-2 bg-popover border rounded-lg shadow-lg"
  isVisible={showToolbar}
  position={toolbarPosition}
>
  {/* Text Formatting */}
  <ToolbarButton 
    icon={<Bold size={16} />}
    active={editor.isActive('bold')}
    onClick={() => editor.chain().focus().toggleBold().run()}
    tooltip="Bold (Ctrl+B)"
  />
  
  <ToolbarButton 
    icon={<Italic size={16} />}
    active={editor.isActive('italic')}
    onClick={() => editor.chain().focus().toggleItalic().run()}
    tooltip="Italic (Ctrl+I)"
  />
  
  <ToolbarButton 
    icon={<UnderlineIcon size={16} />}
    active={editor.isActive('underline')}
    onClick={() => editor.chain().focus().toggleUnderline().run()}
    tooltip="Underline (Ctrl+U)"
  />
  
  <ToolbarButton 
    icon={<Strikethrough size={16} />}
    active={editor.isActive('strike')}
    onClick={() => editor.chain().focus().toggleStrike().run()}
    tooltip="Strikethrough"
  />
  
  <Separator />
  
  {/* Alignment */}
  <AlignmentSelector 
    value={getAlignment()}
    onChange={handleAlignment}
  />
  
  <Separator />
  
  {/* Colors */}
  <ColorPicker 
    type="text"
    value={getTextColor()}
    onChange={handleTextColor}
    tooltip="Text Color"
  />
  
  <ColorPicker 
    type="background"
    value={getHighlightColor()}
    onChange={handleHighlightColor}
    tooltip="Highlight Color"
  />
  
  <Separator />
  
  {/* Link */}
  <LinkModal editor={editor} />
  
  <Separator />
  
  {/* More Options */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <ToolbarButton icon={<MoreVertical size={16} />} />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={handleSubscript}>
        Subscript
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSuperscript}>
        Superscript
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleCode}>
        Inline Code
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleCopyFormatting}>
        Copy Formatting
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleClearFormatting}>
        Clear Formatting
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</FloatingToolbar>
```

#### 3.3 Slash Commands

```tsx
const SLASH_COMMANDS: SlashCommand[] = [
  // Text
  { id: 'text', title: 'Text', icon: Type, run: () => insertText() },
  { id: 'h1', title: 'Heading 1', icon: Heading1, run: () => insertHeading(1) },
  { id: 'h2', title: 'Heading 2', icon: Heading2, run: () => insertHeading(2) },
  { id: 'h3', title: 'Heading 3', icon: Heading3, run: () => insertHeading(3) },
  
  // Lists
  { id: 'ul', title: 'Bullet List', icon: List, run: () => toggleBulletList() },
  { id: 'ol', title: 'Numbered List', icon: ListOrdered, run: () => toggleOrderedList() },
  { id: 'task', title: 'Task List', icon: ListChecks, run: () => toggleTaskList() },
  
  // Blocks
  { id: 'quote', title: 'Quote', icon: Quote, run: () => insertBlockquote() },
  { id: 'code', title: 'Code Block', icon: FileCode2, run: () => insertCodeBlock() },
  { id: 'divider', title: 'Divider', icon: Minus, run: () => insertDivider() },
  { id: 'callout', title: 'Callout', icon: AlertCircle, run: () => insertCallout() },
  { id: 'toggle', title: 'Toggle', icon: ChevronDown, run: () => insertToggle() },
  
  // Tables & Media
  { id: 'table', title: 'Table', icon: TableIcon, run: () => insertTable() },
  { id: 'image', title: 'Image', icon: ImagePlus, run: () => insertImage() },
  { id: 'embed', title: 'Embed', icon: Iframe, run: () => insertEmbed() },
  
  // Advanced
  { id: 'mention', title: 'Mention', icon: AtSign, run: () => insertMention() },
  { id: 'link', title: 'Link', icon: Link2, run: () => insertLink() },
];
```

---

### Phase 4: Collaboration Features (Week 4-5)

#### 4.1 Real-time Sync

```typescript
// WebSocket events
namespace PageEvents {
  // Content updates
  'page:content-update' → broadcast to all editors
  'page:content-update-confirm' ← acknowledgment
  'page:content-conflict' → handle merge conflicts
  
  // Presence
  'page:user-joined' → user started editing
  'page:user-left' → user stopped editing
  'page:cursor-position' → live cursor
  'page:selection' → text selection
  
  // Awareness
  'page:user-typing' → typing indicator
  'page:user-idle' → stopped typing
  
  // Comments
  'page:comment-added' → new comment
  'page:comment-updated' → comment edited
  'page:comment-deleted' → comment removed
  'page:comment-reply' → comment reply
  
  // Versions
  'page:version-saved' → new snapshot
  'page:version-restored' → restored to older version
}
```

#### 4.2 Presence Indicators

```tsx
<PresenceAvatar 
  user={user}
  position={cursorPosition}
  selection={textSelection}
  typing={isTyping}
  color={userColor}
/>
```

#### 4.3 Collaborative Cursors

```tsx
<CollaborativeCursor 
  userId={user.id}
  position={cursorPos}
  color={userColor}
  name={user.name}
/>
```

---

### Phase 5: Version History (Week 5)

#### 5.1 Auto-Save & Snapshots

```typescript
// Strategy:
// - Save on every significant change (debounced)
// - Create snapshot every 5 minutes with significant changes
// - Keep full edit history for undo/redo
// - Limit snapshots to last 100 versions per page

const AutoSaveConfig = {
  debounceMs: 1000,        // Wait 1 second after last change
  snapshotInterval: 5 * 60 * 1000, // Snapshot every 5 min
  maxSnapshots: 100,
  maxChangeHistory: 1000,
};
```

#### 5.2 Version Browser

```tsx
<VersionHistory>
  {versions.map((version) => (
    <VersionCard 
      key={version.id}
      version={version}
      onRestore={() => restoreVersion(version.id)}
      onCompare={() => compareVersions(currentVersion, version)}
      onPreview={() => previewVersion(version.id)}
    />
  ))}
</VersionHistory>
```

#### 5.3 Version Diff Viewer

```tsx
<VersionDiffViewer 
  from={fromVersion}
  to={toVersion}
  showChanges={showChanges}
  onRestore={handleRestore}
/>
```

---

### Phase 6: Advanced Features (Week 6)

#### 6.1 Search System

```typescript
// Search Strategy:
// 1. Full-text search on MongoDB (title + content + tags)
// 2. Advanced filters: visibility, owner, date, tags, linked-tasks
// 3. Search syntax: 
//    - "exact phrase"
//    - owner:@username
//    - type:shared
//    - created:this-week
//    - tag:#design

interface SearchQuery {
  term: string;
  filters: {
    visibility?: PageVisibility[];
    owner?: string[];
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    hasAttachments?: boolean;
    hasComments?: boolean;
    linkedTasks?: boolean;
  };
  sort?: 'relevance' | 'recent' | 'title';
  limit?: number;
  offset?: number;
}
```

#### 6.2 Page Relations

```typescript
// Nested Pages (Hierarchy)
interface PageHierarchy {
  parentPageId: ObjectId;       // Parent page
  childPageIds: ObjectId[];     // Sub-pages
  level: number;                // Nesting level
  position: number;             // Order in parent
}

// Backlinks (Referenced by)
interface PageBacklink {
  fromPageId: ObjectId;         // Page that references this
  fromPageTitle: string;
  linkedAt: Date;
}

// Related Pages
interface PageRelation {
  relatedPageId: ObjectId;      // Related page
  relationshipType: 'backlink' | 'tag' | 'task' | 'project';
  strength: number;             // Relevance score
}

// Mentions
interface PageMention {
  userId: ObjectId;
  mentionedAt: Date;
  context: string;              // Quote around mention
}
```

#### 6.3 Export System

```typescript
// Export Formats
interface ExportOptions {
  format: 'pdf' | 'docx' | 'markdown' | 'html';
  includeComments?: boolean;
  includeHistory?: boolean;
  includeMetadata?: boolean;
  pageBreaks?: boolean;
  fontSize?: number;
  fontFamily?: string;
}
```

---

### Phase 7: Testing & QA (Week 7)

#### Test Categories

1. **Functionality Tests**
   - [ ] Create/Read/Update/Delete pages
   - [ ] Edit content with all formatting options
   - [ ] Version history creation and restore
   - [ ] Sharing and permissions
   - [ ] Comments and mentions
   - [ ] Export to PDF/DOCX

2. **Collaboration Tests**
   - [ ] Real-time sync with multiple users
   - [ ] Presence indicators
   - [ ] Live cursors
   - [ ] Conflict resolution
   - [ ] Comment threading

3. **Performance Tests**
   - [ ] Large documents (10k+ blocks)
   - [ ] Many collaborators (20+)
   - [ ] Rapid changes
   - [ ] Search on large dataset
   - [ ] Memory usage

4. **Regression Tests**
   - [ ] Existing page data still accessible
   - [ ] Permissions still enforced
   - [ ] Links to tasks still working
   - [ ] Public pages still shareable
   - [ ] Notifications still sending
   - [ ] API backward compatibility

5. **Browser Compatibility**
   - [ ] Chrome (latest)
   - [ ] Firefox (latest)
   - [ ] Safari (latest)
   - [ ] Edge (latest)

6. **Mobile Responsiveness**
   - [ ] Tablet editing
   - [ ] Mobile viewing
   - [ ] Touch interactions
   - [ ] Responsive toolbar

7. **Accessibility**
   - [ ] Keyboard navigation
   - [ ] Screen reader support
   - [ ] WCAG 2.1 AA compliance
   - [ ] Focus management
   - [ ] Color contrast

---

## Backward Compatibility Plan

### Data Migration Strategy

```typescript
// 1. Keep existing Page collection as-is
// 2. Create PageV2 with same data
// 3. Dual-write during transition
// 4. Gradual migration from old to new
// 5. Maintain API compatibility

// Migration Steps:
1. Create PageV2 schema in MongoDB
2. Copy all existing Page documents to PageV2
3. Transform content from simple string to JSON blocks
4. Update API to check both collections
5. Run daily sync to keep in-sync
6. After 2 weeks, flip to PageV2 as primary
7. Keep Page collection for rollback
8. After 1 month, deprecate Page collection
```

### Feature Flags

```typescript
const pageFeatureFlags = {
  useNewEditor: process.env.PAGES_NEW_EDITOR === 'true', // Default: false
  enableCollaboration: process.env.PAGES_COLLABORATION === 'true', // Default: false
  enableVersionHistory: process.env.PAGES_HISTORY === 'true', // Default: false
  enableComments: process.env.PAGES_COMMENTS === 'true', // Default: false
  enableAdvancedSearch: process.env.PAGES_SEARCH === 'true', // Default: false
};

// Gradual rollout:
// Week 1: 10% of users → New UI (grid/list views)
// Week 2: 50% of users → Add editor improvements
// Week 3: 100% of users → Full feature release
// Month 2: Disable feature flags, make new system default
```

---

## Breaking Changes Prevention

### API Versioning

```typescript
// Maintain backward compatibility
GET  /api/v1/pages        → Returns old format
GET  /api/v2/pages        → Returns new format

// Old format still supported
POST /api/pages
{
  title: string;
  content: string;         // Accept both string and JSON
  visibility: string;
  allowedUsers: string[];
}

// Automatically detect and convert
// String content → TipTap JSON
// JSON content → passthrough
```

### Permission Preservation

```typescript
// All existing permissions continue to work:
- Private page access (creatorId check)
- Workspace visibility
- Public links (publicId/publicSlug)
- allowedUsers list
- Public archived pages

// No permission changes
// No access revocation
// No data loss
```

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Editor Load Time** | < 1s | ~2s |
| **Save Latency** | < 500ms | ~1s |
| **Search Results** | < 300ms | N/A |
| **Collaboration Sync** | < 200ms | N/A |
| **Document Size** | Support 50k blocks | ~1k blocks |
| **User Satisfaction** | 4.5+ rating | 2.5 rating |
| **Zero Data Loss** | 100% | - |
| **API Uptime** | 99.9% | Current |
| **Mobile UX** | Pass audit | Fail |
| **Accessibility** | WCAG AA | Partial |

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Schema & API | 2 weeks | Enhanced DB, API endpoints |
| Phase 2: Components | 1-2 weeks | New UI, list view, cards |
| Phase 3: Editor | 1-2 weeks | Rich editor, formatting |
| Phase 4: Collaboration | 1-2 weeks | Real-time sync, presence |
| Phase 5: History | 1 week | Version browser, autosave |
| Phase 6: Advanced | 1 week | Search, relations, export |
| Phase 7: Testing | 1-2 weeks | QA, bug fixes, optimization |
| **Total** | **~8 weeks** | **Production-ready system** |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Breaking changes** | High | Critical | Feature flags, dual-write, versioned API |
| **Performance regression** | Medium | High | Load testing, optimization sprint |
| **Data corruption** | Low | Critical | Backup strategy, rollback plan |
| **Collaboration conflicts** | Medium | High | Conflict resolution, testing |
| **Mobile UX issues** | Medium | Medium | Early mobile testing, responsive design |
| **Migration delays** | Medium | Medium | Phased rollout, fallback API |

---

## Conclusion

This redesign transforms the Pages system from a basic note-taking tool into a world-class collaborative document platform. By maintaining strict backward compatibility while adding powerful new features, we provide users with a professional, modern experience without disrupting their existing workflows.

The phased approach allows for iterative improvements, testing, and feedback collection while minimizing risk. Feature flags enable gradual rollout and easy rollback if issues arise.

**Result**: A Pages system comparable to **Microsoft Word**, **Notion**, and **Confluence** - production-ready, performant, and delightful to use.

---

**Document Version**: 1.0  
**Last Updated**: May 29, 2026  
**Author**: GitHub Copilot  
**Status**: Ready for Implementation
