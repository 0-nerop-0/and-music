import { useSettingsStore } from '../stores/settingsStore'

export function useTranslation() {
  const language = useSettingsStore((state) => state.language)
  return (ru: string, en: string) => language === 'en' ? en : ru
}
