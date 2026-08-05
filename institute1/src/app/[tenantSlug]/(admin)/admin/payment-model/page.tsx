import { authenticateAdminOrSuper, fetchRevenueMetrics, fetchPlans, fetchSubscriptions, fetchPaymentSettings, fetchCoupons } from '@/features/billing/actions';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import BillingStatsCards from './components/BillingStatsCards';
import PlanManager from './components/PlanManager';
import RevenueCharts from './components/RevenueCharts';
import SubscriptionManager from './components/SubscriptionManager';
import ActivePlanCard from './components/ActivePlanCard';
import CouponsManager from './components/CouponsManager';
import PaymentConfigurations from './components/PaymentConfigurations';
import RecentTransactions from './components/RecentTransactions';
import AuditLogs from './components/AuditLogs';
import DashboardHeaderActions from './components/DashboardHeaderActions';
import styles from './payment.module.css';

export const metadata = {
  title: 'Billing & Subscriptions | Smart Learn AI Admin',
  description: 'Manage SaaS pricing plans, subscriptions, revenues, and invoices',
};

export default async function PaymentModelDashboardPage() {
  let authContext;
  try {
    authContext = await authenticateAdminOrSuper();
  } catch (err) {
    return null;
  }

  const { isSuperAdmin } = authContext;
  
  const [metrics, plans, subs, settings, coupons] = await Promise.all([
    fetchRevenueMetrics(),
    fetchPlans(),
    fetchSubscriptions(),
    fetchPaymentSettings(),
    fetchCoupons()
  ]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.maxContent} ${styles.header}`}>
        <div>
          <h1 className={styles.headerTitle}>
            Payment & Subscription Management
          </h1>
          <p className={styles.headerSubtitle}>
            Manage pricing, subscriptions, revenue, billing and payment infrastructure.
          </p>
        </div>
        
        {isSuperAdmin && <DashboardHeaderActions />}
      </div>

      <div className={`${styles.maxContent} ${styles.section}`}>
        {isSuperAdmin && (
          <>
            <section>
              <BillingStatsCards metrics={metrics} />
            </section>
            <section>
               <RevenueCharts />
            </section>
          </>
        )}

        <section>
          <PlanManager isSuperAdmin={isSuperAdmin} initialPlans={plans || []} />
        </section>
        
        <section>
          {isSuperAdmin ? (
            <SubscriptionManager isSuperAdmin={isSuperAdmin} initialSubs={subs || []} />
          ) : (
            <ActivePlanCard subscription={subs && subs.length > 0 ? subs[0] : null} />
          )}
        </section>
        
        {isSuperAdmin && (
          <>
            <section>
              <CouponsManager isSuperAdmin={isSuperAdmin} initialCoupons={coupons || []} />
            </section>
            <section>
              <PaymentConfigurations isSuperAdmin={isSuperAdmin} initialSettings={settings} />
            </section>
            <section>
              <RecentTransactions isSuperAdmin={isSuperAdmin} />
            </section>
            <section>
              <AuditLogs isSuperAdmin={isSuperAdmin} />
            </section>
          </>
        )}
      </div>
      
    </div>
  );
}
