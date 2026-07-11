import * as React from 'react';

export function useDelayedOpen(shouldOpen: boolean, delayMs = 500): boolean {
  const [open, setOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!shouldOpen) {
      setOpen(false);
      return undefined;
    }

    setOpen(false);

    const timeoutId = window.setTimeout(() => {
      setOpen(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, shouldOpen]);

  return open;
}
