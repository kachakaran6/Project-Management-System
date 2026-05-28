import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

type Props = {
  initialContent?: any;
  onSave?: (content: any) => Promise<void> | void;
};

export const PageEditorV2: React.FC<Props> = ({ initialContent, onSave }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
      CharacterCount.configure({ limit: 100000 }),
    ],
    content: initialContent || '',
  });

  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  const handleSave = async () => {
    if (!editor) return;
    const json = editor.getJSON();
    setSaving(true);
    try {
      await onSave?.(json);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-editor-v2">
      <div className="editor-toolbar mb-2">
        <button onClick={() => editor?.commands.toggleBold()} disabled={!editor}>Bold</button>
        <button onClick={() => editor?.commands.toggleItalic()} disabled={!editor}>Italic</button>
        <button onClick={() => editor?.commands.toggleBulletList()} disabled={!editor}>List</button>
        <button onClick={() => editor?.commands.setParagraph()} disabled={!editor}>Paragraph</button>
        <button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
      </div>
      <div className="editor-area border rounded p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default PageEditorV2;
