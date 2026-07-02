import type { ReactElement } from 'react';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@safevoices/ui/components/avatar';
import { cn } from '@safevoices/ui/lib/utils';
import { brandIconSrc } from '../../lib/branding';

export function AssistantAvatar({
    className,
}: {
    className?: string;
}): ReactElement {
    return (
        <Avatar
            className={cn('border-2 border-primary bg-card', className)}
        >
            <AvatarImage
                src={brandIconSrc}
                alt=""
                className="bg-card object-contain p-1"
            />
            <AvatarFallback className="bg-card text-xs font-semibold text-primary">
                SV
            </AvatarFallback>
        </Avatar>
    );
}
