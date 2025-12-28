import { Globe } from 'lucide-react';
import { useLanguageStore } from '../stores/useLanguageStore';
import { LANGUAGE_NAMES, type Language } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-300 border border-primary/20">
        <Globe className="w-7 h-7 text-primary" />
        <span className="text-lg font-semibold">{LANGUAGE_NAMES[language]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className="text-lg py-3 cursor-pointer"
          >
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
