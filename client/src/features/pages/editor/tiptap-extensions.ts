/**
 * PMS Orbit — Professional Tiptap Editor Extensions
 * Consolidated exports for the page editor.
 */

export { StarterKit } from '@tiptap/starter-kit';
export { default as Placeholder } from '@tiptap/extension-placeholder';
export { default as Underline } from '@tiptap/extension-underline';
export { default as Link } from '@tiptap/extension-link';
export { default as TaskList } from '@tiptap/extension-task-list';
export { default as TaskItem } from '@tiptap/extension-task-item';
export { default as Mention } from '@tiptap/extension-mention';
export { default as TextAlign } from '@tiptap/extension-text-align';
export { default as Image } from '@tiptap/extension-image';
export { Table } from '@tiptap/extension-table';
export { TableRow } from '@tiptap/extension-table-row';
export { TableHeader } from '@tiptap/extension-table-header';
export { TableCell } from '@tiptap/extension-table-cell';
export { default as CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
export { default as CharacterCount } from '@tiptap/extension-character-count';
export { default as Highlight } from '@tiptap/extension-highlight';
export { default as Subscript } from '@tiptap/extension-subscript';
export { default as Superscript } from '@tiptap/extension-superscript';
// TextStyle + Color removed: incompatible with @tiptap/core v3.22.x
// export { default as TextStyle } from '@tiptap/extension-text-style';
// export { Color } from '@tiptap/extension-color';
export { default as Typography } from '@tiptap/extension-typography';
export { CalloutExtension } from './callout-extension';
export type { CalloutType } from './callout-extension';
export { CALLOUT_CONFIGS } from './callout-extension';
