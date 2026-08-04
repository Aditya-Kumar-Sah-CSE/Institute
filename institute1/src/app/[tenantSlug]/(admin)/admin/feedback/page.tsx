import React from 'react';
import { fetchAllSupportTickets, resolveSupportTicket } from '@/features/support/actions';
import { CheckCircle, Search, Mail, Clock, ShieldAlert, MessageSquare } from 'lucide-react';
import styles from '../payment-model/payment.module.css';

export const metadata = {
  title: 'Support Feedback | Super Admin',
  description: 'Manage institutional feedback and support requests.',
};

export default async function AdminFeedbackPage() {
  const tickets = await fetchAllSupportTickets();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Feedback & Support Hub</h1>
          <p className={styles.subtitle}>Review direct messages passed through the global contact portal.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input type="text" placeholder="Search unread tickets..." className={styles.searchInput} disabled />
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <MessageSquare size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '8px' }}>Inbox Empty</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You have successfully reviewed all outstanding feedback!</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}><ShieldAlert size={18} /> Support Queue ({tickets.filter((t: any) => t.status === 'Pending').length} Pending)</h3>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Topic</th>
                  <th>Payload</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket: any) => (
                  <tr key={ticket.id} className={styles.tableRow}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                           <a href={`mailto:${ticket.email}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{ticket.email}</a>
                        </span>
                      </div>
                    </td>
                    <td>
                       <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{ticket.subject || 'General Request'}</span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                       <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>
                         {ticket.message}
                       </p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Clock size={14} />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: ticket.status === 'Resolved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: ticket.status === 'Resolved' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        border: `1px solid ${ticket.status === 'Resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                      }}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket.status !== 'Resolved' ? (
                        <form action={async () => {
                          'use server';
                          await resolveSupportTicket(ticket.id);
                        }}>
                          <button type="submit" className={styles.actionButton} style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle size={16} /> Mark Handled
                          </button>
                        </form>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
