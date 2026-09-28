"use client";

import React, { useEffect } from "react";
import { Box, IconButton, Divider } from "@mui/material";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

// TipTap's Link mark only recognizes attributes declared in its schema —
// any other attribute on a pasted/set <a> tag (like a plain data-form-id)
// gets silently dropped on parse, so the "which form is this link for"
// state would vanish the moment the editor re-parses its content. Adding
// it here makes the attribute part of the mark's schema, so it survives
// the parse/render round-trip like href does.
const FormLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-form-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-form-id"),
        renderHTML: (attributes) => {
          if (!attributes["data-form-id"]) return {};
          return { "data-form-id": attributes["data-form-id"] };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      disabled={disabled}
      sx={{
        borderRadius: "6px",
        color: active ? "#1A73E8" : "#5A5A5A",
        bgcolor: active ? "#EAF2FE" : "transparent",
        "&:hover": { bgcolor: active ? "#EAF2FE" : "#F5F5F5" },
      }}
    >
      {children}
    </IconButton>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message here…",
  minHeight = 140,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      FormLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // useEditor only seeds `content` once, on creation — without this, switching
  // to a different step's template would leave the editor showing whatever
  // was loaded first instead of the newly-selected step's content.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  return (
    <>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          px: 1.5,
          py: 0.75,
          mt: 1.25,
          borderTop: "1px solid #EEE",
          borderBottom: "1px solid #EEE",
          flexWrap: "wrap",
        }}
      >
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlinedIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughSIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <FormatQuoteIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <InsertLinkIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <UndoIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <RedoIcon sx={{ fontSize: 17 }} />
        </ToolbarButton>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          minHeight,
          fontSize: 13,
          "& .ProseMirror": { outline: "none" },
          "& .ProseMirror p.is-editor-empty:first-of-type::before": {
            content: "attr(data-placeholder)",
            color: "#B0B0B0",
            float: "left",
            height: 0,
            pointerEvents: "none",
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </>
  );
}
