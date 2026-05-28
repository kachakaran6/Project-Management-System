import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/next-navigation';
import {
  Archive,
  Copy,
  FileText,
  Filter,
  Globe,
  Grid,
  List,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Star,
  Table2,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useCreatePageMutationV2,
  usePagesQueryV2,
} from '@/features/pages/hooks/use-page-query-v2';
import type { PageDocV2, PageVisibility } from '@/types/page-v2.types';

type ViewMode = 'grid' | 'list' | 'table' | 'compact';

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return d.toLocaleDateString();
}

function toInitials(firstName?: string, lastName?: string): string {
  return (
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'U'
  );
}

// ============================================================================
// PAGE CARD - GRID VIEW
// ============================================================================

function PageCardGrid({ page, onEdit, onShare, onMore }: {
  page: PageDocV2;
  onEdit: (page: PageDocV2) => void;
  onShare: (page: PageDocV2) => void;
  onMore: (page: PageDocV2) => void;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur transition-all hover:border-border hover:bg-card hover:shadow-md">
      {/* Cover */}
      <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden">
        {page.coverUrl ? (
          <img src={page.coverUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-400/20 to-slate-600/20" />
        )}
      </div>

      {/* Badge Bar */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {}}
          title="Favorite"
        >
          <Star className="h-5 w-5 cursor-pointer text-yellow-500 hover:fill-yellow-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Icon + Title */}
        <div className="flex gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">{page.icon || '📄'}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {page.title}
            </h3>
            {page.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {page.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{getPreview(page)}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Avatar size="xs" src={page.creator?.avatarUrl}>
            <AvatarFallback>
              {toInitials(page.creator?.firstName, page.creator?.lastName)}
            </AvatarFallback>
          </Avatar>
          <span>{page.creator?.firstName}</span>
          <span>•</span>
          <span>{formatDate(page.updatedAt)}</span>
        </div>

        {/* Visibility & Tags */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
          <div className="flex gap-1 flex-wrap">
            {page.visibility === 'PRIVATE' && (
              <Badge variant="secondary" size="sm" className="gap-1">
                <Lock className="h-3 w-3" /> Private
              </Badge>
            )}
            {page.visibility === 'PUBLIC' && (
              <Badge variant="secondary" size="sm" className="gap-1">
                <Globe className="h-3 w-3" /> Public
              </Badge>
            )}
            {page.tags?.slice(0, 1).map(tag => (
              <Badge key={tag} variant="outline" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>
          {page.linkedTaskIds?.length ? (
            <span className="text-xs font-medium text-muted-foreground">
              {page.linkedTaskIds.length} tasks
            </span>
          ) : null}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={() => onEdit(page)}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={() => onShare(page)}
        >
          Share
        </Button>
        <button onClick={() => onMore(page)}>
          <MoreVertical className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE ROW - LIST VIEW
// ============================================================================

function PageRowList({ page, onEdit, onShare, onMore }: {
  page: PageDocV2;
  onEdit: (page: PageDocV2) => void;
  onShare: (page: PageDocV2) => void;
  onMore: (page: PageDocV2) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-border/30 hover:bg-muted/30 transition-colors">
      {/* Checkbox */}
      <input type="checkbox" className="h-4 w-4 cursor-pointer" />

      {/* Icon + Title */}
      <div className="flex-1 min-w-0 flex items-start gap-3">
        <div className="text-lg flex-shrink-0 mt-0.5">{page.icon || '📄'}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{page.title}</h4>
          {page.description && (
            <p className="text-xs text-muted-foreground truncate">{page.description}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{getPreview(page)}</p>
        </div>
      </div>

      {/* Metadata Columns */}
      <div className="flex items-center gap-8 text-sm text-muted-foreground flex-shrink-0 w-96">
        {/* Creator */}
        <div className="flex items-center gap-2 w-32">
          <Avatar size="xs" src={page.creator?.avatarUrl}>
            <AvatarFallback size="xs">
              {toInitials(page.creator?.firstName, page.creator?.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{page.creator?.firstName}</span>
        </div>

        {/* Date */}
        <span className="w-24 text-right">{formatDate(page.updatedAt)}</span>

        {/* Visibility */}
        <div className="w-20">
          {page.visibility === 'PRIVATE' && (
            <Badge variant="secondary" size="sm" className="gap-1">
              <Lock className="h-3 w-3" /> Private
            </Badge>
          )}
          {page.visibility === 'PUBLIC' && (
            <Badge variant="secondary" size="sm" className="gap-1">
              <Globe className="h-3 w-3" /> Public
            </Badge>
          )}
        </div>

        {/* Linked Items */}
        <span className="w-16 text-right">
          {page.linkedTaskIds?.length || 0} tasks
        </span>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(page)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(page)}>Share</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onMore(page)}>More...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// PAGES LIST HEADER
// ============================================================================

function PagesListHeader({
  view,
  onViewChange,
  search,
  onSearchChange,
  onCreatePage,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onCreatePage: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Left: Search & Filters */}
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search pages..."
              className="h-9 rounded-lg border-border/40 bg-muted/20 pl-10 text-sm"
            />
          </div>

          {/* Filter Button */}
          <Button size="sm" variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Center: View Selector */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            size="sm"
            variant={view === 'grid' ? 'default' : 'ghost'}
            className="gap-2 h-8"
            onClick={() => onViewChange('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'ghost'}
            className="gap-2 h-8"
            onClick={() => onViewChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={view === 'table' ? 'default' : 'ghost'}
            className="gap-2 h-8"
            onClick={() => onViewChange('table')}
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" title="Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button onClick={onCreatePage} className="gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PagesListV2Page() {
  const router = useRouter();
  const { user } = useAuth();

  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

  const pagesQuery = usePagesQueryV2({ page: 1, limit: 100 });
  const createPage = useCreatePageMutationV2();

  const pages = (pagesQuery.data?.data?.items || pagesQuery.data?.items || []) as PageDocV2[];

  const getPreview = (page: PageDocV2) => {
    if (page.plainText && page.plainText.length > 0) return page.plainText.slice(0, 200);
    if (typeof page.content === 'string') return page.content.replace(/<[^>]*>/g, '').slice(0, 200);
    try {
      return JSON.stringify(page.content).slice(0, 200);
    } catch {
      return '';
    }
  };

  const filteredPages = useMemo(() => {
    if (!search) return pages;

    const term = search.toLowerCase();
    return pages.filter(
      page =>
        page.title.toLowerCase().includes(term) ||
        page.description?.toLowerCase().includes(term),
    );
  }, [pages, search]);

  const handleCreatePage = async () => {
    const title = prompt('Page title:');
    if (!title) return;

    try {
      const created = await createPage.mutateAsync({
        title: title.trim(),
        content: '<p></p>',
        visibility: 'WORKSPACE',
      });

      router.push(`/pages/${created.data.id}`);
      toast.success('Page created');
    } catch {
      toast.error('Failed to create page');
    }
  };

  const handleEditPage = (page: PageDocV2) => {
    router.push(`/pages/${page.id}`);
  };

  const handleSharePage = (page: PageDocV2) => {
    // TODO: Open share dialog
    toast.info('Share dialog coming soon');
  };

  const handleMorePage = (page: PageDocV2) => {
    // TODO: Open more menu
    toast.info('More menu coming soon');
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <PagesListHeader
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        onCreatePage={handleCreatePage}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {pagesQuery.isLoading ? (
          // Loading skeleton
          <div className="space-y-2 p-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          // Empty state
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<FileText className="h-12 w-12 text-muted-foreground" />}
              title="No pages yet"
              description={
                search
                  ? `No pages match "${search}"`
                  : 'Create your first page to get started'
              }
              action={
                !search && (
                  <Button onClick={handleCreatePage} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Page
                  </Button>
                )
              }
            />
          </div>
        ) : view === 'grid' ? (
          // Grid view
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPages.map(page => (
              <PageCardGrid
                key={page.id}
                page={page}
                onEdit={handleEditPage}
                onShare={handleSharePage}
                onMore={handleMorePage}
              />
            ))}
          </div>
        ) : (
          // List view
          <div className="divide-y divide-border/30">
            {filteredPages.map(page => (
              <PageRowList
                key={page.id}
                page={page}
                onEdit={handleEditPage}
                onShare={handleSharePage}
                onMore={handleMorePage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
