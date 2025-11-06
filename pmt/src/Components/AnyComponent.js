import { useTranslation } from 'react-i18next';

function AnyComponent() {
  // Specify the namespaces you need
  const { t } = useTranslation(['translation', 'components']);
  
  return (
    <div>
      <h1>{t('some.translation.key')}</h1>
      <p>{t('another.translation.key', { ns: 'components' })}</p>
    </div>
  );
}
