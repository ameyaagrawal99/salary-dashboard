import { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/settings-context';

interface InfoTooltipProps {
  shortText: string;
  title: string;
  detail: string;
  className?: string;
}

export function InfoTooltip({ shortText, title, detail, className = '' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();

  if (settings.tooltipMode === 'concise') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={`h-5 w-5 rounded-full opacity-50 ${className}`}
            data-testid="button-info-tooltip"
          >
            <Info className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p>{shortText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={`h-5 w-5 rounded-full opacity-50 ${className}`}
            onClick={() => setOpen(true)}
            data-testid="button-info-tooltip"
          >
            <Info className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p>{shortText}</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {detail}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
