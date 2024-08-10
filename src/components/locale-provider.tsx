import { useAtomValue } from 'jotai';
import { IntlProvider } from 'react-intl';
import { localeJotai } from '../jotais/settings';
import messages from '../../locales';
import { PropsWithChildren } from 'react';

export default function LocaleProvider ({children}: PropsWithChildren) {
    const locale = useAtomValue(localeJotai);
    return (
        <IntlProvider messages={messages[locale as keyof typeof messages]} locale={locale} defaultLocale='en'>
            {children}
        </IntlProvider>
    );
}
