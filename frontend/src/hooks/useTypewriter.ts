import { useEffect, useState } from 'react';

const DEFAULT_EXAMPLES = [
  'Peaceful instrumental music for studying at 3 AM…',
  'Fast-paced electronic for an intense workout…',
  'Mellow acoustic songs for a rainy Sunday morning…',
  'Dreamy synth for a late-night drive…',
];

export function useTypewriter(
  examples: string[] = DEFAULT_EXAMPLES,
  paused: boolean = false
): string {
  const [displayText, setDisplayText] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const currentFullText = examples[exampleIndex % examples.length];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      // Typing forward
      if (displayText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, 55);
      } else {
        // Finished typing; pause for 2s before erasing
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    } else {
      // Erasing backward
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 28);
      } else {
        // Finished erasing; move to next example
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % examples.length);
        timer = setTimeout(() => {}, 400);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, exampleIndex, paused, examples]);

  return displayText;
}
