import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Type, Palette, ChevronDown, Check, Wand2 } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

const COLORS = [
    { label: 'Gold', value: '#D4AF37' },
    { label: 'Red', value: '#ef4444' },
    { label: 'White', value: '#ffffff' },
    { label: 'Gray', value: '#9ca3af' },
    { label: 'Black', value: '#000000' },
    { label: 'Blue', value: '#3b82f6' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState('#D4AF37');
    const [isFocused, setIsFocused] = useState(false);

    // Initialize content only once to prevent cursor jumping
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // Only update if the content is significantly different (empty or first load)
            // This is a simple check; for full robustness we implies checking if focused.
            if (!editorRef.current.innerText.trim() && !value) {
                return; // Both empty
            }
            if (document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, arg: string | undefined = undefined) => {
        document.execCommand(command, false, arg);
        handleInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        // Get plain text from clipboard
        const text = e.clipboardData.getData('text/plain');
        // Insert as plain text to strip all HTML formatting (backgrounds, etc)
        document.execCommand('insertText', false, text);
        handleInput();
    };

    const applyColor = (color: string) => {
        execCommand('foreColor', color);
        setShowColorPicker(false);
    };

    const autoFormatContent = () => {
        if (!editorRef.current) return;

        let html = editorRef.current.innerHTML;

        // 1. Clean up excessive whitespace and empty tags
        html = html.replace(/&nbsp;/g, ' ');
        html = html.replace(/\s{2,}/g, ' '); // remove multiple spaces
        html = html.replace(/<p><br><\/p>/g, '<br>'); // Clean empty paragraphs
        html = html.replace(/(<br\s*\/?>){3,}/g, '<br><br>'); // Max 2 line breaks max

        // 2. Typography fixes
        html = html.replace(/ - /g, ' — '); // Em dash
        html = html.replace(/"([^"]*)"/g, '«$1»'); // French quotes (Russian standard)
        html = html.replace(/ \./g, '.'); // Remove space before dot
        html = html.replace(/ ,/g, ','); // Remove space before comma
        html = html.replace(/ !/g, '!'); // Remove space before exclamation
        html = html.replace(/ \?/g, '?'); // Remove space before question

        // 2.5 Newlines to breaks (if missing tags)
        html = html.replace(/\n\n+/g, '<br><br>');

        // 3. Add non-breaking space after short prepositions (Russian)
        const prepositions = ['в', 'без', 'до', 'из', 'к', 'на', 'по', 'о', 'от', 'перед', 'при', 'через', 'с', 'у', 'за', 'над', 'об', 'под', 'про', 'для', 'и', 'а', 'но', 'да'];
        const prepRegex = new RegExp(`\\b(${prepositions.join('|')})\\s+`, 'gi');
        html = html.replace(prepRegex, '$1&nbsp;');

        // Apply back
        editorRef.current.innerHTML = html;
        handleInput();

        // Show visual feedback (optional flash)
        editorRef.current.classList.add('bg-sparta-gold/10');
        setTimeout(() => {
            editorRef.current?.classList.remove('bg-sparta-gold/10');
        }, 300);
    };

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColorPicker]);

    return (
        <div className="flex flex-col rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden focus-within:border-sparta-gold/50 transition-colors">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-white/5">
                <button
                    type="button"
                    onClick={() => execCommand('bold')}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Жирный"
                >
                    <Bold size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('italic')}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Курсив"
                >
                    <Italic size={18} />
                </button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Color Picker */}
                <div className="relative color-picker-container">
                    <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-1 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Цвет текста"
                    >
                        <Palette size={18} />
                        <ChevronDown size={12} className="opacity-50" />
                    </button>

                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-2 p-3 bg-[#222] border border-white/10 rounded-xl shadow-xl z-50 w-64 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => applyColor(c.value)}
                                        className="w-10 h-10 rounded-lg border border-white/10 hover:scale-105 transition-transform flex items-center justify-center"
                                        style={{ backgroundColor: c.value }}
                                        title={c.label}
                                    >
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded border border-white/20" style={{ backgroundColor: customColor }}></div>
                                    <input
                                        type="text"
                                        value={customColor}
                                        onChange={(e) => setCustomColor(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none focus:border-sparta-gold"
                                        placeholder="#HEX"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => applyColor(customColor)}
                                    className="p-1.5 bg-sparta-gold text-black rounded-lg hover:bg-[#ffd700] transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Font Family (Simple Toggle for now, expanding to picker if needed) */}
                <button
                    type="button"
                    onClick={() => execCommand('fontName', 'Russo One')}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-russo"
                    title="Заголовок Russo One"
                >
                    <Type size={18} />
                </button>

                <div className="w-px h-5 bg-white/10 mx-1 ml-auto" />

                {/* Auto-Format Button */}
                <button
                    type="button"
                    onClick={autoFormatContent}
                    className="flex items-center gap-1.5 p-2 px-3 text-sparta-gold/80 hover:text-black hover:bg-sparta-gold rounded-lg transition-all font-bold text-xs"
                    title="Авто-форматирование текста (типографика, пробелы, красивые кавычки)"
                >
                    <Wand2 size={16} />
                    <span>Улучшить текст</span>
                </button>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                className="p-4 min-h-[200px] text-white outline-none prose prose-invert max-w-none font-manrope whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-white/20 news-editor-content transition-colors duration-300"
                role="textbox"
                data-placeholder={placeholder}
                style={{
                    isolation: 'isolate'
                }}
            />
            {/* Styles for contentEditable placeholder */}
            <style>{`
                [contenteditable]:empty::before {
                    content: attr(data-placeholder);
                    color: rgba(255, 255, 255, 0.2);
                    pointer-events: none;
                    display: block;
                }
                .news-editor-content * {
                    background-color: transparent !important;
                    background: transparent !important;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
