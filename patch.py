import sys

with open('backend/src/modules/task/task.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  const [assigneeRows, tagRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  const pagesCountByTaskId = new Map();
  pagesCountRows.forEach(row => pagesCountByTaskId.set(String(row._id), row.count));

  return {"""

replacement = """  const [assigneeRows, tagRows, pageRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean(),
    TaskPage.find({ taskId: { $in: taskIds } }).lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  const pagesCountByTaskId = new Map();
  pageRows.forEach(row => {
    const count = pagesCountByTaskId.get(String(row.taskId)) || 0;
    pagesCountByTaskId.set(String(row.taskId), count + 1);
  });

  return {"""

if target in content:
    with open('backend/src/modules/task/task.service.ts', 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print('Replaced')
else:
    print('Target not found')
