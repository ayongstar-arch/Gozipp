'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Filter, Calendar, ChevronDown } from 'lucide-react';

type AuditAction =
  | 'APPROVE_DRIVER'
  | 'REJECT_DRIVER'
  | 'QUEUE_OVERRIDE'
  | 'CONFIG_CHANGE'
  | 'ROLE_CHANGE'
  | 'LOGIN'
  | 'EXPORT_DATA'
  | 'PAYMENT_CONFIG'
  | 'SYSTEM_ALERT'
  | 'AI_SCAN';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  actionLabel: string;
  resource: string;
  ipAddress: string;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  APPROVE_DRIVER: 'text-emerald-400 bg-emerald-500/10',
  REJECT_DRIVER: 'text-red-400 bg-red-500/10',
  QUEUE_OVERRIDE: 'text-amber-400 bg-amber-500/10',
  CONFIG_CHANGE: 'text-blue-400 bg-blue-500/10',
  ROLE_CHANGE: 'text-purple-400 bg-purple-500/10',
  LOGIN: 'text-slate-400 bg-white/5',
  EXPORT_DATA: 'text-cyan-400 bg-cyan-500/10',
  PAYMENT_CONFIG: 'text-green-400 bg-green-500/10',
  SYSTEM_ALERT: 'text-red-400 bg-red-500/10',
  AI_SCAN: 'text-violet-400 bg-violet-500/10',
};

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-05-27 20:45:12',
    actor: 'admin@gozipp.app',
    action: 'APPROVE_DRIVER',
    actionLabel: 'อนุมัติคนขับ',
    resource: 'DRV-0305',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-05-27 20:32:08',
    actor: 'admin@gozipp.app',
    action: 'QUEUE_OVERRIDE',
    actionLabel: 'ลัดคิว',
    resource: 'WIN-CENTRAL-01 / DRV-0042',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-003',
    timestamp: '2026-05-27 19:55:30',
    actor: 'finance@gozipp.app',
    action: 'PAYMENT_CONFIG',
    actionLabel: 'แก้ไขช่องทางชำระ',
    resource: 'PromptPay — PM-1',
    ipAddress: '110.164.22.88',
  },
  {
    id: 'AUD-004',
    timestamp: '2026-05-27 19:10:44',
    actor: 'admin@gozipp.app',
    action: 'CONFIG_CHANGE',
    actionLabel: 'เปลี่ยนการตั้งค่า',
    resource: 'referral_points: 50 → 75',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-005',
    timestamp: '2026-05-27 18:22:15',
    actor: 'admin@gozipp.app',
    action: 'AI_SCAN',
    actionLabel: 'เรียก AI Scan',
    resource: 'Intelligence Audit v2.1',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-006',
    timestamp: '2026-05-27 17:50:02',
    actor: 'security@gozipp.app',
    action: 'ROLE_CHANGE',
    actionLabel: 'เปลี่ยน Role',
    resource: 'ops_user01 → ADMIN',
    ipAddress: '182.53.110.90',
  },
  {
    id: 'AUD-007',
    timestamp: '2026-05-27 17:05:38',
    actor: 'admin@gozipp.app',
    action: 'REJECT_DRIVER',
    actionLabel: 'ปฏิเสธคนขับ',
    resource: 'DRV-0299 (เอกสารไม่ครบ)',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-008',
    timestamp: '2026-05-27 16:30:11',
    actor: 'admin@gozipp.app',
    action: 'EXPORT_DATA',
    actionLabel: 'ส่งออกข้อมูล',
    resource: 'accounting_daily_2026-05-27.csv',
    ipAddress: '203.150.45.12',
  },
  {
    id: 'AUD-009',
    timestamp: '2026-05-27 15:15:55',
    actor: 'SYSTEM',
    action: 'SYSTEM_ALERT',
    actionLabel: 'แจ้งเตือนระบบ',
    resource: 'API Gateway CPU > 85%',
    ipAddress: '10.0.0.1',
  },
  {
    id: 'AUD-010',
    timestamp: '2026-05-27 14:02:30',
    actor: 'security@gozipp.app',
    action: 'LOGIN',
    actionLabel: 'เข้าสู่ระบบ',
    resource: 'Admin Panel',
    ipAddress: '182.53.110.90',
  },
];

export default function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filtered =
    actionFilter === 'ALL'
      ? MOCK_AUDIT_LOG
      : MOCK_AUDIT_LOG.filter((e) => e.action === actionFilter);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Audit Trail — บันทึกการดำเนินงาน
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Security & Compliance Logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider
            bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            🔒 SECURITY & SUPER roles only
          </span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* Action Type Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5
            rounded-xl px-3 py-2 text-xs font-bold text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer
                appearance-none pr-4"
            >
              <option value="ALL" className="bg-slate-900">ทั้งหมด</option>
              <option value="APPROVE_DRIVER" className="bg-slate-900">อนุมัติคนขับ</option>
              <option value="REJECT_DRIVER" className="bg-slate-900">ปฏิเสธคนขับ</option>
              <option value="QUEUE_OVERRIDE" className="bg-slate-900">ลัดคิว</option>
              <option value="CONFIG_CHANGE" className="bg-slate-900">เปลี่ยนการตั้งค่า</option>
              <option value="ROLE_CHANGE" className="bg-slate-900">เปลี่ยน Role</option>
              <option value="LOGIN" className="bg-slate-900">เข้าสู่ระบบ</option>
              <option value="EXPORT_DATA" className="bg-slate-900">ส่งออกข้อมูล</option>
              <option value="SYSTEM_ALERT" className="bg-slate-900">แจ้งเตือนระบบ</option>
              <option value="AI_SCAN" className="bg-slate-900">AI Scan</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Date Range (cosmetic) */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5
          rounded-xl px-3 py-2 text-xs font-bold text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>27 พ.ค. 2569</span>
        </div>

        <div className="ml-auto text-[10px] font-bold text-slate-600">
          แสดง {filtered.length} รายการ
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="admin-glass rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase font-black tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-4">เวลา</th>
                <th className="px-5 py-4">ผู้ดำเนินการ</th>
                <th className="px-5 py-4">การกระทำ</th>
                <th className="px-5 py-4">ทรัพยากร</th>
                <th className="px-5 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-5 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                      {entry.actor}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider
                        ${ACTION_COLORS[entry.action]}`}
                    >
                      {entry.actionLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 max-w-[200px] truncate">
                    {entry.resource}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 font-mono">
                    {entry.ipAddress}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
