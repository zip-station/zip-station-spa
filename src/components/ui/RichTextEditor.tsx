import { useRef, useMemo, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Undo, Redo, ImagePlus } from 'lucide-react'

export interface ImageUploadResult {
  storageKey: string
  url: string
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
  onImageUpload?: (file: File) => Promise<ImageUploadResult>
}

const ZsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-zs-key': {
        default: null,
        parseHTML: (el) => el.getAttribute('data-zs-key'),
        renderHTML: (attrs) => (attrs['data-zs-key'] ? { 'data-zs-key': attrs['data-zs-key'] } : {}),
      },
    }
  },
})

export function RichTextEditor({ content, onChange, onSubmit, placeholder, className, onImageUpload }: RichTextEditorProps) {
  const uploadRef = useRef(onImageUpload)
  uploadRef.current = onImageUpload

  const allowImages = !!onImageUpload

  const extensions = useMemo<Extensions>(() => {
    const base: Extensions = [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Type something...',
      }),
    ]
    if (allowImages) {
      base.push(
        ZsImage.configure({
          inline: false,
          allowBase64: false,
          HTMLAttributes: { class: 'max-w-full rounded-md' },
        }),
      )
    }
    return base
    // placeholder/allowImages stable for the editor's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[100px] px-3 py-2',
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          onSubmit?.()
          return true
        }
        return false
      },
      handlePaste: (_view, event) => {
        if (!uploadRef.current) return false
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach((f) => uploadAndInsert(f))
        return true
      },
      handleDrop: (_view, event) => {
        if (!uploadRef.current) return false
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach((f) => uploadAndInsert(f))
        return true
      },
    },
  })

  const uploadAndInsert = async (file: File) => {
    if (!editor || !uploadRef.current) return
    try {
      const result = await uploadRef.current(file)
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src: result.url, 'data-zs-key': result.storageKey, alt: file.name },
        })
        .run()
    } catch (e) {
      console.error('[RichTextEditor] image upload failed', e)
      alert(`Image upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  // Sync external content changes (e.g., when the detail query resolves after
  // the editor has already mounted) into the editor without emitting updates.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (content === editor.getHTML()) return
    editor.commands.setContent(content, { emitUpdate: false })
  }, [editor, content])

  // Create the file input outside the React tree entirely, so the dialog
  // can't interact with the editor's contentEditable focus management.
  const pickImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/gif,image/webp'
    const cleanup = () => {
      input.removeEventListener('change', onChangeHandler)
      input.removeEventListener('cancel', cleanup)
    }
    const onChangeHandler = () => {
      const file = input.files?.[0]
      cleanup()
      if (file) uploadAndInsert(file)
    }
    input.addEventListener('change', onChangeHandler, { once: true })
    input.addEventListener('cancel', cleanup, { once: true })
    input.click()
  }

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className={`rounded-md border border-input bg-background ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {onImageUpload && (
          <ToolbarButton onClick={pickImage} title="Insert Image">
            <ImagePlus className="h-4 w-4" />
          </ToolbarButton>
        )}

        <div className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
