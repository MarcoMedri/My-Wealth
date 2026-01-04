import * as LucideIcons from 'lucide-react';

/**
 * Renders a broker logo based on the logoPath type
 * Supports: asset://, file://, icon:, emoji, and http(s)://
 */
export const renderBrokerLogo = (
    logoPath: string | null | undefined,
    vaultPath: string | null,
    className: string = 'w-full h-full object-contain'
): JSX.Element | null => {
    if (!logoPath) return null;

    // Handle Lucide icons (icon:IconName)
    if (logoPath.startsWith('icon:')) {
        const iconName = logoPath.replace('icon:', '');
        const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
        if (IconComponent) {
            return <IconComponent className={className} />;
        }
        return null;
    }

    // Handle emoji (single character, no protocol)
    if (!logoPath.includes('://') && logoPath.length <= 2) {
        return <span className="text-4xl">{logoPath}</span>;
    }

    // Handle asset:// protocol (preset logos)
    if (logoPath.startsWith('asset://')) {
        return (
            <img
                src={logoPath}
                alt="Logo"
                className={className}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        );
    }

    // Handle file:// protocol or relative paths (custom uploaded logos)
    if (logoPath.startsWith('file://') || (!logoPath.startsWith('http'))) {
        const src = logoPath.startsWith('file://')
            ? logoPath
            : `file://${vaultPath}/${logoPath}`;
        return (
            <img
                src={src}
                alt="Logo"
                className={className}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        );
    }

    // Handle http(s):// (external URLs like Clearbit)
    return (
        <img
            src={logoPath}
            alt="Logo"
            className={className}
            onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
            }}
        />
    );
};
