import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/surface_card.dart';
import '../models/task_model.dart';
import '../providers/task_list_provider.dart';
import 'widgets/compact_task_row.dart';
import 'widgets/quick_add_task_sheet.dart';

enum TaskViewMode { compactList, grouped, board }

class TasksListScreen extends ConsumerStatefulWidget {
  const TasksListScreen({super.key});

  @override
  ConsumerState<TasksListScreen> createState() => _TasksListScreenState();
}

class _TasksListScreenState extends ConsumerState<TasksListScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _selectedTaskIds = <String>{};
  final List<String> _quickFilters = const [
    'All',
    'Assigned To Me',
    'Today',
    'Overdue',
    'Completed',
    'High Priority',
  ];

  String _selectedFilter = 'All';
  String _selectedSort = 'Newest';
  String _groupBy = 'Status';
  TaskViewMode _viewMode = TaskViewMode.compactList;
  Timer? _searchDebouncer;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
  }

  @override
  void dispose() {
    _searchDebouncer?.cancel();
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleSearchChanged() {
    _searchDebouncer?.cancel();
    _searchDebouncer = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) {
        return;
      }
      setState(() {
        _searchQuery = _searchController.text.trim();
      });
    });
  }

  Future<void> _showQuickAdd() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const QuickAddTaskSheet(),
    );
  }

  Future<void> _showFilters() async {
    final result = await showModalBottomSheet<_TaskFilterResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _TaskFilterSheet(
        selectedSort: _selectedSort,
        selectedFilter: _selectedFilter,
        groupBy: _groupBy,
      ),
    );

    if (result == null) {
      return;
    }

    setState(() {
      _selectedFilter = result.quickFilter;
      _selectedSort = result.sort;
      _groupBy = result.groupBy;
      _viewMode = result.viewMode;
    });
  }

  List<TaskModel> _applySearchFilter(List<TaskModel> tasks) {
    final query = _searchQuery.toLowerCase();
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final endOfToday = startOfToday.add(const Duration(days: 1));

    bool matchesQuickFilter(TaskModel task) {
      switch (_selectedFilter) {
        case 'Assigned To Me':
          return task.assignees.isNotEmpty;
        case 'Today':
          final due = DateTime.tryParse(task.dueDate ?? '');
          return due != null && due.isAfter(startOfToday) && due.isBefore(endOfToday);
        case 'Overdue':
          final due = DateTime.tryParse(task.dueDate ?? '');
          return due != null && due.isBefore(startOfToday) && task.status.toUpperCase() != 'DONE';
        case 'Completed':
          return task.status.toUpperCase() == 'DONE';
        case 'High Priority':
          return task.priority.toUpperCase() == 'HIGH' || task.priority.toUpperCase() == 'URGENT';
        case 'All':
        default:
          return true;
      }
    }

    bool matchesSearch(TaskModel task) {
      if (query.isEmpty) {
        return true;
      }

      final assigneeText = task.assignees
          .map((assignee) => '${assignee.firstName} ${assignee.lastName ?? ''} ${assignee.email}')
          .join(' ');

      return [
        task.title,
        task.id,
        task.projectName ?? task.projectId,
        task.description,
        assigneeText,
      ].join(' ').toLowerCase().contains(query);
    }

    return tasks.where((task) => matchesQuickFilter(task) && matchesSearch(task)).toList();
  }

  List<TaskModel> _sortTasks(List<TaskModel> tasks) {
    final sorted = [...tasks];

    DateTime? parseDate(String? value) => DateTime.tryParse(value ?? '');

    int compareDates(String? left, String? right) {
      final leftDate = parseDate(left);
      final rightDate = parseDate(right);
      if (leftDate == null && rightDate == null) return 0;
      if (leftDate == null) return 1;
      if (rightDate == null) return -1;
      return leftDate.compareTo(rightDate);
    }

    switch (_selectedSort) {
      case 'Oldest':
      case 'Due Date':
        sorted.sort((left, right) => compareDates(left.dueDate, right.dueDate));
        break;
      case 'Priority':
        const order = {'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3};
        sorted.sort((left, right) => (order[left.priority.toUpperCase()] ?? 9).compareTo(order[right.priority.toUpperCase()] ?? 9));
        break;
      case 'Alphabetical':
        sorted.sort((left, right) => left.title.toLowerCase().compareTo(right.title.toLowerCase()));
        break;
      case 'Recently Updated':
      case 'Newest':
      default:
        sorted.sort((left, right) => compareDates(right.dueDate, left.dueDate));
        break;
    }

    return sorted;
  }

  Map<String, List<TaskModel>> _groupTasks(List<TaskModel> tasks) {
    final grouped = <String, List<TaskModel>>{};

    String keyFor(TaskModel task) {
      switch (_groupBy) {
        case 'Project':
          return task.projectName?.isNotEmpty == true ? task.projectName! : 'Unassigned Project';
        case 'Priority':
          return task.priority;
        case 'Status':
          return task.status.replaceAll('_', ' ');
        case 'Due Date':
          final due = DateTime.tryParse(task.dueDate ?? '');
          if (due == null) return 'No Due Date';
          final today = DateTime.now();
          final todayStart = DateTime(today.year, today.month, today.day);
          final dueStart = DateTime(due.year, due.month, due.day);
          if (dueStart.isBefore(todayStart)) return 'Overdue';
          if (dueStart == todayStart) return 'Today';
          if (dueStart.isBefore(todayStart.add(const Duration(days: 7)))) return 'This Week';
          return 'Later';
        case 'Assignee':
          if (task.assignees.isEmpty) return 'Unassigned';
          return '${task.assignees.first.firstName} ${task.assignees.first.lastName ?? ''}'.trim();
        default:
          return 'Other';
      }
    }

    for (final task in tasks) {
      final key = keyFor(task);
      grouped.putIfAbsent(key, () => <TaskModel>[]).add(task);
    }

    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(taskListNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      floatingActionButton: FloatingActionButton(
        onPressed: _showQuickAdd,
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        elevation: 2,
        child: const Icon(Icons.add),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(taskListNotifierProvider.notifier).refresh(),
          color: AppColors.primary,
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.canvas,
                elevation: 0,
                scrolledUnderElevation: 1,
                titleSpacing: AppSpacing.base,
                title: Row(
                  children: [
                    Text('Tasks', style: AppTypography.displaySm),
                    const SizedBox(width: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceStrong,
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: state.when(
                        data: (tasks) => Text(
                          '${tasks.length}',
                          style: AppTypography.captionUppercase.copyWith(color: AppColors.ink),
                        ),
                        loading: () => const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.muted),
                        ),
                        error: (error, stackTrace) => const Text('!'),
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.search, color: AppColors.ink),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: const Icon(Icons.filter_list, color: AppColors.ink),
                    onPressed: _showFilters,
                  ),
                ],
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(168),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(AppSpacing.base, AppSpacing.xs, AppSpacing.base, AppSpacing.sm),
                        child: TextField(
                          controller: _searchController,
                          style: AppTypography.bodyMd,
                          decoration: InputDecoration(
                            hintText: 'Search title, id, project, assignee...',
                            hintStyle: AppTypography.bodyMd.copyWith(color: AppColors.mutedSoft),
                            prefixIcon: const Icon(Icons.search, color: AppColors.muted),
                            filled: true,
                            fillColor: AppColors.surfaceCard,
                            contentPadding: const EdgeInsets.symmetric(vertical: 0),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.hairline),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.hairline),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.primary),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(
                        height: 44,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                          scrollDirection: Axis.horizontal,
                          itemCount: _quickFilters.length,
                          separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.xs),
                          itemBuilder: (context, index) {
                            final filter = _quickFilters[index];
                            final isSelected = filter == _selectedFilter;
                            return ChoiceChip(
                              label: Text(filter),
                              selected: isSelected,
                              onSelected: (_) => setState(() => _selectedFilter = filter),
                              selectedColor: AppColors.primary.withValues(alpha: 0.12),
                              labelStyle: AppTypography.bodySm.copyWith(
                                color: isSelected ? AppColors.primary : AppColors.ink,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              ),
                              side: BorderSide(color: isSelected ? AppColors.primary : AppColors.hairline),
                              backgroundColor: AppColors.surfaceCard,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                            );
                          },
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(AppSpacing.base, AppSpacing.sm, AppSpacing.base, AppSpacing.sm),
                        child: _ViewModeToggle(
                          selected: _viewMode,
                          onChanged: (value) => setState(() => _viewMode = value),
                        ),
                      ),
                      const Divider(height: 1, color: AppColors.hairline),
                    ],
                  ),
                ),
              ),
              state.when(
                loading: () => SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => const LoadingSkeleton(
                      isLoading: true,
                      child: CompactTaskRowSkeleton(),
                    ),
                    childCount: 12,
                  ),
                ),
                error: (error, stack) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Text(
                        'Error loading tasks',
                        style: AppTypography.bodyMd.copyWith(color: AppColors.semanticError),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
                data: (tasks) {
                  final visibleTasks = _sortTasks(_applySearchFilter(tasks));

                  if (visibleTasks.isEmpty) {
                    return SliverFillRemaining(
                      hasScrollBody: false,
                      child: _EmptyTasksState(
                        title: _selectedFilter == 'All' ? 'No Tasks Found' : 'No Results',
                        message: _searchQuery.isNotEmpty
                            ? 'Try a different title, project, or assignee.'
                            : 'There are no tasks for the selected filter.',
                      ),
                    );
                  }

                  if (_viewMode == TaskViewMode.grouped) {
                    final groups = _groupTasks(visibleTasks);
                    final entries = groups.entries.toList();

                    return SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final entry = entries[index];
                          return _GroupedTaskSection(
                            title: entry.key,
                            count: entry.value.length,
                            tasks: entry.value,
                            onTaskTap: (task) => context.push('/tasks/${task.id}', extra: task),
                            selectedTaskIds: _selectedTaskIds,
                            onToggleTaskSelection: (taskId) {
                              setState(() {
                                if (_selectedTaskIds.contains(taskId)) {
                                  _selectedTaskIds.remove(taskId);
                                } else {
                                  _selectedTaskIds.add(taskId);
                                }
                              });
                            },
                          );
                        },
                        childCount: entries.length,
                      ),
                    );
                  }

                  if (_viewMode == TaskViewMode.board) {
                    final columns = const ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
                    return SliverToBoxAdapter(
                      child: SizedBox(
                        height: 640,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.base, AppSpacing.base, AppSpacing.base, 96),
                          scrollDirection: Axis.horizontal,
                          itemCount: columns.length,
                          separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final status = columns[index];
                            final columnTasks = visibleTasks.where((task) => task.status.toUpperCase() == status).toList();
                            return _BoardColumn(
                              status: status,
                              tasks: columnTasks,
                              onTaskTap: (task) => context.push('/tasks/${task.id}', extra: task),
                            );
                          },
                        ),
                      ),
                    );
                  }

                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final task = visibleTasks[index];
                        return CompactTaskRow(
                          task: task,
                          isSelected: _selectedTaskIds.contains(task.id),
                          onSelectionChanged: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedTaskIds.add(task.id);
                              } else {
                                _selectedTaskIds.remove(task.id);
                              }
                            });
                          },
                          onTap: () => context.push('/tasks/${task.id}', extra: task),
                          onMoreActions: () {},
                          onSwipeComplete: () {},
                          onSwipeMore: () {},
                        );
                      },
                      childCount: visibleTasks.length,
                    ),
                  );
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ViewModeToggle extends StatelessWidget {
  final TaskViewMode selected;
  final ValueChanged<TaskViewMode> onChanged;

  const _ViewModeToggle({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<TaskViewMode>(
      segments: const [
        ButtonSegment(value: TaskViewMode.compactList, icon: Icon(Icons.view_list_rounded), label: Text('List')),
        ButtonSegment(value: TaskViewMode.grouped, icon: Icon(Icons.account_tree_outlined), label: Text('Grouped')),
        ButtonSegment(value: TaskViewMode.board, icon: Icon(Icons.view_column_outlined), label: Text('Board')),
      ],
      selected: {selected},
      onSelectionChanged: (values) => onChanged(values.first),
      showSelectedIcon: false,
      style: const ButtonStyle(
        visualDensity: VisualDensity.compact,
        backgroundColor: WidgetStatePropertyAll(AppColors.surfaceCard),
        side: WidgetStatePropertyAll(BorderSide(color: AppColors.hairline)),
      ),
    );
  }
}

class _GroupedTaskSection extends StatelessWidget {
  final String title;
  final int count;
  final List<TaskModel> tasks;
  final ValueChanged<TaskModel> onTaskTap;
  final Set<String> selectedTaskIds;
  final ValueChanged<String> onToggleTaskSelection;

  const _GroupedTaskSection({
    required this.title,
    required this.count,
    required this.tasks,
    required this.onTaskTap,
    required this.selectedTaskIds,
    required this.onToggleTaskSelection,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.base, AppSpacing.base, AppSpacing.base, 0),
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: AppTypography.titleMd)),
                Text('$count Tasks', style: AppTypography.caption.copyWith(color: AppColors.muted)),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            const Divider(height: 1, color: AppColors.hairline),
            const SizedBox(height: AppSpacing.xs),
            ...tasks.take(6).map(
              (task) => CompactTaskRow(
                task: task,
                isSelected: selectedTaskIds.contains(task.id),
                onSelectionChanged: (_) => onToggleTaskSelection(task.id),
                onTap: () => onTaskTap(task),
                onMoreActions: () {},
                onSwipeComplete: () {},
                onSwipeMore: () {},
              ),
            ),
            if (tasks.length > 6) ...[
              const SizedBox(height: AppSpacing.xs),
              Text('+${tasks.length - 6} more tasks', style: AppTypography.caption.copyWith(color: AppColors.muted)),
            ],
          ],
        ),
      ),
    );
  }
}

class _BoardColumn extends StatelessWidget {
  final String status;
  final List<TaskModel> tasks;
  final ValueChanged<TaskModel> onTaskTap;

  const _BoardColumn({required this.status, required this.tasks, required this.onTaskTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(status.replaceAll('_', ' '), style: AppTypography.titleMd),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceStrong,
                    borderRadius: BorderRadius.circular(9999),
                  ),
                  child: Text('${tasks.length}', style: AppTypography.captionUppercase),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            const Divider(height: 1, color: AppColors.hairline),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: ListView.separated(
                itemCount: tasks.length,
                separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.xs),
                itemBuilder: (context, index) {
                  final task = tasks[index];
                  return CompactTaskRow(
                    task: task,
                    onTap: () => onTaskTap(task),
                    onSelectionChanged: (_) {},
                    onMoreActions: () {},
                    onSwipeComplete: () {},
                    onSwipeMore: () {},
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyTasksState extends StatelessWidget {
  final String title;
  final String message;

  const _EmptyTasksState({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, size: 64, color: AppColors.mutedSoft),
            const SizedBox(height: AppSpacing.md),
            Text(title, style: AppTypography.titleMd, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message,
              style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskFilterResult {
  final String quickFilter;
  final String sort;
  final String groupBy;
  final TaskViewMode viewMode;

  const _TaskFilterResult({required this.quickFilter, required this.sort, required this.groupBy, required this.viewMode});
}

class _TaskFilterSheet extends StatefulWidget {
  final String selectedFilter;
  final String selectedSort;
  final String groupBy;

  const _TaskFilterSheet({required this.selectedFilter, required this.selectedSort, required this.groupBy});

  @override
  State<_TaskFilterSheet> createState() => _TaskFilterSheetState();
}

class _TaskFilterSheetState extends State<_TaskFilterSheet> {
  late String _selectedFilter;
  late String _selectedSort;
  late String _groupBy;
  TaskViewMode _viewMode = TaskViewMode.compactList;

  @override
  void initState() {
    super.initState();
    _selectedFilter = widget.selectedFilter;
    _selectedSort = widget.selectedSort;
    _groupBy = widget.groupBy;
  }

  void _apply() {
    Navigator.of(context).pop(
      _TaskFilterResult(
        quickFilter: _selectedFilter,
        sort: _selectedSort,
        groupBy: _groupBy,
        viewMode: _viewMode,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.82,
      minChildSize: 0.55,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.canvas,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Center(
                child: Container(
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.hairlineStrong,
                    borderRadius: BorderRadius.circular(9999),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Filters', style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.lg),
              Text('View Mode', style: AppTypography.titleSm),
              const SizedBox(height: AppSpacing.sm),
              _filterChips<TaskViewMode>(
                values: const {
                  TaskViewMode.compactList: 'Compact List',
                  TaskViewMode.grouped: 'Grouped',
                  TaskViewMode.board: 'Board View',
                },
                selected: _viewMode,
                onChanged: (value) => setState(() => _viewMode = value),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Quick Filters', style: AppTypography.titleSm),
              const SizedBox(height: AppSpacing.sm),
              _filterChips<String>(
                values: const {
                  'All': 'All',
                  'Assigned To Me': 'Assigned To Me',
                  'Today': 'Today',
                  'Overdue': 'Overdue',
                  'Completed': 'Completed',
                  'High Priority': 'High Priority',
                },
                selected: _selectedFilter,
                onChanged: (value) => setState(() => _selectedFilter = value),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Sort By', style: AppTypography.titleSm),
              const SizedBox(height: AppSpacing.sm),
              _filterChips<String>(
                values: const {
                  'Newest': 'Newest',
                  'Oldest': 'Oldest',
                  'Due Date': 'Due Date',
                  'Priority': 'Priority',
                  'Recently Updated': 'Recently Updated',
                  'Alphabetical': 'Alphabetical',
                },
                selected: _selectedSort,
                onChanged: (value) => setState(() => _selectedSort = value),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Group By', style: AppTypography.titleSm),
              const SizedBox(height: AppSpacing.sm),
              _filterChips<String>(
                values: const {
                  'Status': 'Status',
                  'Project': 'Project',
                  'Priority': 'Priority',
                  'Due Date': 'Due Date',
                  'Assignee': 'Assignee',
                },
                selected: _groupBy,
                onChanged: (value) => setState(() => _groupBy = value),
              ),
              const SizedBox(height: AppSpacing.xl),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _apply,
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _filterChips<T>({
    required Map<T, String> values,
    required T selected,
    required ValueChanged<T> onChanged,
  }) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: values.entries.map((entry) {
        final isSelected = entry.key == selected;
        return ChoiceChip(
          label: Text(entry.value),
          selected: isSelected,
          onSelected: (_) => onChanged(entry.key),
          selectedColor: AppColors.primary.withValues(alpha: 0.12),
          labelStyle: AppTypography.bodySm.copyWith(
            color: isSelected ? AppColors.primary : AppColors.ink,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
          ),
          side: BorderSide(color: isSelected ? AppColors.primary : AppColors.hairline),
          backgroundColor: AppColors.surfaceCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
        );
      }).toList(),
    );
  }
}