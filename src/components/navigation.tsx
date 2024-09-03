import { useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';

interface NavItemProps {
    path: string;
    icon: string;
    label: string;
}

function NavItem ({ path, icon, label }: NavItemProps) {
    const location = useLocation();
    return (
        <Link to={path} draggable={false} className='flex flex-row items-center gap-1 lg:gap-2 color-text-pri dark:color-text-dark-pri font-size-sm p-2 pl-0 bg-white rounded-1.5 bg-opacity-0 hover:bg-opacity-40 dark:hover:bg-opacity-10 transition-all cursor-pointer'>
            <span className={`bg-fg-pri w-0.75 h-4 -mr-0.5 rounded-full ${location.pathname === path ? '' : 'invisible'}`} />
            <span className={`w-5 h-5 ${icon}`} />
            <span className='hidden lg:block'>{label}</span>
        </Link>
    );
}

export default function Navigation () {
    const intl = useIntl();
    const navItems = [
        {
            section: intl.formatMessage({ defaultMessage: 'Library'}), items: [
                { path: '/', icon: 'i-fluent:music-note-1-20-regular', label: intl.formatMessage({ defaultMessage: 'Songs'}) },
                { path: '/album', icon: 'i-fluent:album-20-regular', label: intl.formatMessage({ defaultMessage: 'Albums' }) },
                { path: '/artist', icon: 'i-fluent:people-20-regular', label: intl.formatMessage({ defaultMessage: 'Artists' }) },
                { path: '/songlist', icon: 'i-fluent:list-20-regular', label: intl.formatMessage({ defaultMessage: 'Songlists' }) },
            ]
        },
        {
            section: intl.formatMessage({ defaultMessage: 'Storage' }), items: [
                { path: '/local', icon: 'i-fluent:folder-20-regular', label: intl.formatMessage({ defaultMessage: 'Local' }) },
                /* { path: '/webdav', icon: 'i-fluent:folder-globe-20-regular', label: intl.formatMessage({ defaultMessage: 'WebDAV' }) }, */
                { path: '/ncm', icon: 'i-simple-icons:neteasecloudmusic', label: intl.formatMessage({ defaultMessage: 'NCM' }) },
            ]
        },
    ];

    return (
        <div className='flex flex-col pl-3 px-2 lg:px-4 lg:w-72 h-[calc(100vh-64px)]'>
            {navItems.map((section, index) => (
                <div key={index}>
                    <span className='hidden lg:block font-500 my-2'>{section.section}</span>
                    <span className={`${index !== 0 ? 'block' : 'hidden'} my-1 lg:hidden w-full border-b-(1 solid outline-pri) dark:border-b-outline-dark-pri`} />
                    {section.items.map((item, itemIndex) => (
                        <NavItem key={itemIndex} {...item} />
                    ))}
                </div>
            ))}
            <div className='grow-1' />
            <NavItem path='/settings' icon='i-fluent:settings-20-regular w-5 h-5' label={intl.formatMessage({ defaultMessage: 'Settings'})} />
        </div>
    );
}
