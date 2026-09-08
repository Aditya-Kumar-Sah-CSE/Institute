'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import './Footer.css';

interface FooterProps {
  companyName?: string;
}

export default function Footer({ companyName: initialCompanyName }: FooterProps) {
  const [companyName, setCompanyName] = useState<string>(initialCompanyName || '');

  useEffect(() => {
    if (initialCompanyName) {
      setCompanyName(initialCompanyName);
      return;
    }

    const fetchCompanyName = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('company_settings')
          .select('company_name')
          .single();

        if (data?.company_name) {
          setCompanyName(data.company_name);
        } else {
          setCompanyName('smart learn');
        }
      } catch (err) {
        setCompanyName('smart learn');
      }
    };

    fetchCompanyName();
  }, [initialCompanyName]);

  const displayName = companyName || 'smart learn';

  return (
    <footer className="app-global-footer">
      <div className="app-global-footer-container">
        <p className="app-global-footer-text">
          All rights are reserved @{displayName}
        </p>
      </div>
    </footer>
  );
}
