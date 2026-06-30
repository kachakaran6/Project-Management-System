import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (type?: CalloutType) => ReturnType;
      setCalloutType: (type: CalloutType) => ReturnType;
    };
  }
}

export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'note';

export const CALLOUT_CONFIGS: Record<CalloutType, { icon: string; label: string }> = {
  info: { icon: 'ℹ️', label: 'Info' },
  warning: { icon: '⚠️', label: 'Warning' },
  success: { icon: '✅', label: 'Success' },
  error: { icon: '❌', label: 'Error' },
  note: { icon: '📝', label: 'Note' },
};

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element) => element.getAttribute('data-callout-type') as CalloutType,
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const type = node.attrs.type as CalloutType;
    const config = CALLOUT_CONFIGS[type] || CALLOUT_CONFIGS.info;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'callout',
        'data-callout-type': type,
        class: 'callout-block',
      }),
      [
        'span',
        { class: 'callout-icon', contenteditable: 'false' },
        config.icon,
      ],
      [
        'div',
        { class: 'callout-content' },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (type: CalloutType = 'info') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },
      setCalloutType:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        if (this.editor.isActive(this.name)) {
          return this.editor.commands.exitCode();
        }
        return false;
      },
    };
  },
});

export default CalloutExtension;
