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
  routingMode: string;
  baseUrl: string;
};

const TenantContext = createContext<TenantContextType>({
  tenant: null,
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
    <TenantContext.Provider value={{ tenant, routingMode, baseUrl }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

interface TenantLinkProps extends LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function TenantLink({ href, children, className, onClick, style, ...props }: TenantLinkProps) {
  const { baseUrl } = useTenant();
  
  // External links skip base url
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  
  // Prevent double slashes
  const formattedHref = (isExternal || href === '') 
    ? href 
    : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;

  return (
    <Link href={formattedHref} className={className} onClick={onClick} style={style} {...props}>
      {children}
    </Link>
  );
}
