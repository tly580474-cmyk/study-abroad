import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import TiptapUnderline from '@tiptap/extension-underline';
import TiptapTextAlign from '@tiptap/extension-text-align';
import TiptapYoutube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { ImageIcon, Link, Type, Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({ content, onChange, placeholder = '输入内容...', editable = true }: RichTextEditorProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      TiptapUnderline,
      TiptapTextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TiptapYoutube.configure({
        controls: true,
        nocookie: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageModal(false);
    }
  }, [imageUrl, editor]);

  const handleVideoUpload = useCallback(() => {
    if (videoUrl && editor) {
      const videoId = extractYoutubeId(videoUrl);
      if (videoId) {
        editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${videoId}` }).run();
      } else {
        editor.chain().focus().setYoutubeVideo({ src: videoUrl }).run();
      }
      setVideoUrl('');
      setShowVideoModal(false);
    }
  }, [videoUrl, editor]);

  const handleYoutubeEmbed = useCallback(() => {
    if (youtubeUrl && editor) {
      const videoId = extractYoutubeId(youtubeUrl);
      if (videoId) {
        editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${videoId}` }).run();
      } else {
        editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
      }
      setYoutubeUrl('');
      setShowYoutubeModal(false);
    }
  }, [youtubeUrl, editor]);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleLinkInsert = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkModal(false);
    }
  }, [linkUrl, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-200' : ''}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-200' : ''}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-gray-200' : ''}
          >
            <Type className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
          >
            H1
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
          >
            H2
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
          >
            H3
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
          >
            <Quote className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkModal(true)}
            className={editor.isActive('link') ? 'bg-gray-200' : ''}
          >
            <Link className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowImageModal(true)}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVideoModal(true)}
          >
            <span className="text-xs font-medium">视频</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowYoutubeModal(true)}
          >
            <YoutubeIcon className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      )}

      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[200px]" />

      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)}>
        <ModalHeader>插入图片</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">图片地址</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="输入图片URL..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowImageModal(false)}>取消</Button>
          <Button onClick={handleImageUpload}>插入</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)}>
        <ModalHeader>插入视频</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">视频地址</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="输入视频URL (MP4/WebM)..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowVideoModal(false)}>取消</Button>
          <Button onClick={handleVideoUpload}>插入</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showYoutubeModal} onClose={() => setShowYoutubeModal(false)}>
        <ModalHeader>嵌入YouTube视频</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube地址</label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="输入YouTube视频链接..."
              />
            </div>
            <p className="text-sm text-gray-500">
              支持完整YouTube链接、youtu.be短链接或视频ID
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowYoutubeModal(false)}>取消</Button>
          <Button onClick={handleYoutubeEmbed}>嵌入</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)}>
        <ModalHeader>插入链接</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">链接地址</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="输入链接URL..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowLinkModal(false)}>取消</Button>
          <Button onClick={handleLinkInsert}>插入</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}