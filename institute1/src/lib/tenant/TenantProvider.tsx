'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import Link, { LinkProps } from 'next/link';

export type TenantConfig = {
  id: string;
  name: string;
  slug: string;
  primary_domain: string | null;
  custom_domain: string | null;
  logo?: string | null;
  theme?: any | null;
  status: string;
  plan_id: string | null;
};

type TenantContextType = {
  tenant: TenantConfig | null;
  tenantSlug: string;
  tenantId: string | null;
  routingMode: string;
  baseUrl: string;
};

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantSlug: '',
  tenantId: null,
  routingMode: 'root',
  baseUrl: ''
});

export function TenantProvider({ 
  children, 
  tenant, 
  routingMode, 
  baseUrl 
}: { 
  children: ReactNode,
  tenant: TenantConfig | null,
  routingMode: string,
  baseUrl: string
}) {
  return (
    <TenantContext.Provider value={{ 
      tenant, 
      tenantSlug: tenant?.slug || '',
      tenantId: tenant?.id || null,
      routingMode, 
      baseUrl 
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

interface TenantLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  style?: React.CSSProperties;
  title?: string;
  target?: string;
  id?: string;
  suppressHydrationWarning?: boolean;
}

export function TenantLink({ href, children, className, onClick, style, title, target, id, suppressHydrationWarning, ...props }: TenantLinkProps) {
  const { baseUrl, tenantSlug } = useTenant();
  
  // External links skip base url
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  
  // Determine effective tenant URL prefix
  const prefix = (baseUrl !== undefined && baseUrl !== '') ? baseUrl : (tenantSlug ? `/${tenantSlug}` : '');

  // Prevent double-prefixing: if href already starts with prefix or baseUrl, don't prefix again
  const alreadyPrefixed = Boolean(
    (prefix && href.startsWith(prefix)) || 
    (baseUrl && href.startsWith(baseUrl))
  );
  
  const formattedHref = (isExternal || href === '' || alreadyPrefixed) 
    ? href 
    : `${prefix}${href.startsWith('/') ? href : '/' + href}`;

  return (
    <Link href={formattedHref} className={className} onClick={onClick} style={style} title={title} target={target} id={id} suppressHydrationWarning={suppressHydrationWarning} {...props}>
      {children}
    </Link>
  );
}
