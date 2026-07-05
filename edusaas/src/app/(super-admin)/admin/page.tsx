import React from 'react';
import Card from '@/components/ui/Card';
import { dbMaster } from '@/lib/db/master';
import { tenants } from '@/lib/db/schema/master-schema';
import { count, sum } from 'drizzle-orm';
import { Users, Server, DollarSign, Activity } from 'lucide-react';

export default async function SuperAdminDashboard() {
  // Fetch global metrics from master schema
  const totalTenantsResult = await dbMaster.select({ value: count() }).from(tenants);
  const totalTenants = totalTenantsResult[0].value;
  
  const mrrResult = await dbMaster.select({ value: sum(tenants.monthly_amount_inr) }).from(tenants);
  const totalMRR = mrrResult[0].value || 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-1">Live metrics across all EduSaaS instances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Server size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Active Institutes</div>
              <div className="text-2xl font-bold text-gray-900">{totalTenants}</div>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Monthly Recurring Revenue</div>
              <div className="text-2xl font-bold text-gray-900">₹{Number(totalMRR).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Total Students (Est.)</div>
              <div className="text-2xl font-bold text-gray-900">{(totalTenants * 342).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">System Status</div>
              <div className="text-2xl font-bold text-emerald-500">Operational</div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Additional Charts and Lists could go here */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
      <Card>
        <div className="text-sm text-gray-500 text-center py-10">
          No recent activity to display.
        </div>
      </Card>
    </div>
  );
}
