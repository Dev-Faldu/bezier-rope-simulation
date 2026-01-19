import React from 'react';
import { 
  Pencil, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2,
  Download,
  Minus,
  Plus,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import type { ToolType, ToolSettings } from '@/types/canvas';
import { COLORS, BRUSH_WIDTHS } from '@/types/canvas';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  settings: ToolSettings;
  onSettingsChange: (settings: Partial<ToolSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  onSettingsChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
}) => {
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'brush', icon: <Pencil className="h-5 w-5" />, label: 'Brush (B)' },
    { type: 'eraser', icon: <Eraser className="h-5 w-5" />, label: 'Eraser (E)' },
  ];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'b':
          onSettingsChange({ tool: 'brush' });
          break;
        case 'e':
          onSettingsChange({ tool: 'eraser' });
          break;
        case 'z':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
          }
          break;
        case '[':
          adjustBrushWidth(-1);
          break;
        case ']':
          adjustBrushWidth(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSettingsChange, onUndo, onRedo]);

  const adjustBrushWidth = (direction: number) => {
    const currentIndex = BRUSH_WIDTHS.indexOf(settings.width as typeof BRUSH_WIDTHS[number]);
    const newIndex = Math.max(0, Math.min(BRUSH_WIDTHS.length - 1, currentIndex + direction));
    onSettingsChange({ width: BRUSH_WIDTHS[newIndex] });
  };

  return (
    <div className="toolbar absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 rounded-xl animate-fade-in z-10">
      <div className="flex flex-col gap-1">
        {tools.map(({ type, icon, label }) => (
          <Tooltip key={type} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSettingsChange({ tool: type })}
                className={cn('tool-button', settings.tool === type && 'active')}
                aria-label={label}
              >
                {icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator className="bg-border/50" />

      <div className="flex flex-col gap-1">
        {COLORS.slice(0, 5).map((color) => (
          <Tooltip key={color} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSettingsChange({ color, tool: 'brush' })}
                className={cn(
                  'color-swatch',
                  settings.color === color && 'active'
                )}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{color}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <div className="flex flex-wrap gap-1 mt-1">
          {COLORS.slice(5).map((color) => (
            <button
              key={color}
              onClick={() => onSettingsChange({ color, tool: 'brush' })}
              className={cn(
                'color-swatch w-4 h-4',
                settings.color === color && 'active'
              )}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className="flex flex-col gap-1 items-center">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => adjustBrushWidth(1)}
              className="tool-button"
              aria-label="Increase brush size"
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Increase size (])</p>
          </TooltipContent>
        </Tooltip>
        
        <div 
          className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center"
          style={{ transform: `scale(${0.3 + (settings.width / 20) * 0.7})` }}
        />
        
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => adjustBrushWidth(-1)}
              className="tool-button"
              aria-label="Decrease brush size"
            >
              <Minus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Decrease size ([)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator className="bg-border/50" />

      <div className="flex flex-col gap-1">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={cn('tool-button', !canUndo && 'opacity-30 cursor-not-allowed')}
              aria-label="Undo"
            >
              <Undo2 className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Undo</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={cn('tool-button', !canRedo && 'opacity-30 cursor-not-allowed')}
              aria-label="Redo"
            >
              <Redo2 className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onClear}
              className="tool-button text-destructive hover:text-destructive"
              aria-label="Clear canvas"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Clear canvas</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onExport}
              className="tool-button"
              aria-label="Export"
            >
              <Download className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Export as PNG</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
